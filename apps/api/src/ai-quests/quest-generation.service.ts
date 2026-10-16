import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource,In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Settings } from '../config/settings.js';
import { DomainError } from '../common/http.js';
import { AuditService } from '../audit/audit.service.js';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { User } from '../database/entities/user.entity.js';
import { Role,UserStatus } from '../database/entities/domain.js';
import { rows,numeric,text } from '../progress/sql.js';
import { Quest } from '../quests/quest.entity.js';
import { managedQuest } from '../quests/quest.mapper.js';
import { occupied } from '../quests/quest.policy.js';
import { QuestsService } from '../quests/quests.service.js';
import { GeneratedQuestValidator } from './generated-quest.validator.js';
import { AiProvider } from './ai-provider.js';
import { AiGenerationSession,AiQuestSuggestion } from './ai.entity.js';
import { requestSchema,generatedPayloadSchema,draftValues,aiWarnings } from './generation.schema.js';
import type { GenerationRequest,GeneratedPayload } from './generation.schema.js';
import type { AiPageQueryDto,GenerationResponseDto,GenerationSessionDto,SuggestionDto,GenerationPageDto,SuggestionPageDto } from './ai.dto.js';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
@Injectable()
export class QuestGenerationService {
  constructor(private readonly source: DataSource,private readonly settings: Settings,private readonly provider: AiProvider,private readonly validator: GeneratedQuestValidator,
    private readonly access: OrganizationAccess,private readonly quests: QuestsService,private readonly audit: AuditService) {}
  private async actor(manager: EntityManager,id: string) {
    const user = await manager.findOneBy(User,{ id,status: UserStatus.ACTIVE });
    if (!user || !user.roles.some(r => [Role.VOLUNTEER,Role.ORGANIZER,Role.ADMIN].includes(r))) throw new DomainError(403,'FORBIDDEN','Генерація недоступна.');
    return user;
  }
  private async maintain(manager: EntityManager) {
    await manager.query(`UPDATE ai_generation_sessions SET status='FAILED',error_code='AI_LEASE_EXPIRED',completed_at=clock_timestamp()
      WHERE id IN (SELECT id FROM ai_generation_sessions WHERE status='RUNNING' AND lease_expires_at<=now() ORDER BY lease_expires_at,id LIMIT 100 FOR UPDATE SKIP LOCKED)`);
    const expired = rows(await manager.query('SELECT id FROM ai_generation_sessions WHERE retention_at<=now() AND request IS NOT NULL ORDER BY retention_at,id LIMIT 100 FOR UPDATE SKIP LOCKED')).map(r => text(r.id));
    if (expired.length) {
      await manager.query('UPDATE ai_quest_suggestions SET payload=NULL WHERE session_id=ANY($1::uuid[]) AND payload IS NOT NULL',[expired]);
      await manager.query('UPDATE ai_generation_sessions SET request=NULL WHERE id=ANY($1::uuid[])',[expired]);
    }
    await manager.query("DELETE FROM ai_generation_quota WHERE bucket_date < (now() AT TIME ZONE 'UTC')::date-2");
  }
  async cleanup(actorId: string) { await this.source.transaction(async m => { await m.query("SELECT pg_advisory_xact_lock(hashtext('dniproxp:ai:admission'))");await this.maintain(m);await this.audit.record(m,actorId,'AI_RETENTION_CLEANUP','ai_generation',null); });return { completed: true }; }
  private async admit(userId: string,key: string,request: GenerationRequest,requestId: string | null) {
    return this.source.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('dniproxp:ai:admission'))");
      await this.actor(manager,userId);await this.maintain(manager);
      const requestHash = hash(request),old = await manager.findOneBy(AiGenerationSession,{ userId,idempotencyKey: key });
      if (old) { if (old.requestHash !== requestHash) throw new DomainError(409,'IDEMPOTENCY_CONFLICT','Ключ використано для іншого запиту.');return { session: old,fresh: false }; }
      const configuration = this.provider.configuration();
      if (request.organizationId) {
        const user = await this.actor(manager,userId);if (!user.roles.includes(Role.ORGANIZER)) throw new DomainError(403,'FORBIDDEN','Потрібна роль організатора.');
        await this.access.requireCapability(manager,request.organizationId,userId,'manage');
      }
      const e = this.settings.values,count = request.count ?? 1;
      if (count > e.AI_MAX_SUGGESTIONS) throw new DomainError(422,'VALIDATION_FAILED','Зменш кількість ідей у запиті.');
      const running = rows(await manager.query("SELECT count(*)::text AS total FROM ai_generation_sessions WHERE status='RUNNING' AND lease_expires_at>clock_timestamp() AND NOT is_fixture"))[0];
      if (numeric(running?.total) >= e.AI_CONCURRENCY_LIMIT) throw new DomainError(429,'RATE_LIMITED','AI зараз зайнятий.',{ retryAfterSeconds: 15 });
      // Reserve the worst-case number of billable suggestions, including output-repair calls.
      const units = count*(1+e.AI_OUTPUT_RETRIES);
      const buckets: [string,number][] = [['global',e.AI_GLOBAL_DAILY_LIMIT],[`user:${userId}`,e.AI_USER_DAILY_LIMIT]];
      if (request.organizationId) buckets.push([`org:${request.organizationId}`,e.AI_ORG_DAILY_LIMIT]);
      for (const [scope,limit] of buckets) {
        const result = rows(await manager.query(`INSERT INTO ai_generation_quota(scope,bucket_date,units) VALUES($1,(now() AT TIME ZONE 'UTC')::date,$2)
          ON CONFLICT(scope,bucket_date) DO UPDATE SET units=ai_generation_quota.units+EXCLUDED.units WHERE ai_generation_quota.units+EXCLUDED.units<=$3 RETURNING units`,[scope,units,limit]));
        if (units > limit || !result.length) throw new DomainError(429,'RATE_LIMITED','Денний ліміт AI вичерпано.',{ retryAfterSeconds: 3600 });
      }
      const session = await manager.save(AiGenerationSession,manager.create(AiGenerationSession,{ userId,organizationId: request.organizationId ?? null,
        idempotencyKey: key,requestHash,request,...configuration,status: 'RUNNING',attempts: 0,isFixture: false,errorCode: null,completedAt: null,
        leaseExpiresAt: new Date(Date.now()+e.AI_TIMEOUT_MS*(1+e.AI_OUTPUT_RETRIES)+60000),retentionAt: new Date(Date.now()+e.AI_RETENTION_DAYS*86400000) }));
      await this.audit.record(manager,userId,'AI_GENERATION_STARTED','ai_generation',session.id,{ requestId,provider: configuration.provider,model: configuration.model,count });
      return { session,fresh: true };
    });
  }
  async generate(userId: string,key: string,raw: unknown,requestId: string | null,signal?: AbortSignal): Promise<GenerationResponseDto> {
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) throw new DomainError(422,'VALIDATION_FAILED','Перевір параметри генерації.');
    const request: GenerationRequest = { schemaVersion: 1,input: parsed.data.input,count: parsed.data.count ?? 1,...(parsed.data.organizationId ? { organizationId: parsed.data.organizationId } : {}) };
    const { session,fresh } = await this.admit(userId,key,request,requestId);
    if (!fresh) return this.response(userId,session.id);
    try {
      let payloads: GeneratedPayload[] | undefined;
      for (let attempt = 0;attempt <= this.settings.values.AI_OUTPUT_RETRIES;attempt++) {
        if (signal?.aborted) throw new DomainError(409,'GENERATION_CANCELLED','Генерацію скасовано.');
        const claim = await this.source.manager.createQueryBuilder().update(AiGenerationSession).set({ attempts: attempt+1 })
          .where('id=:id AND status=:status AND lease_expires_at>clock_timestamp()', { id: session.id,status: 'RUNNING' }).execute();
        if (claim.affected !== 1) throw new DomainError(409,'GENERATION_CANCELLED','Час виконання генерації минув.');
        const value = await this.provider.generate(request.input,request.count ?? 1,session.id,attempt,signal);
        try { payloads = this.validator.validate(value,request.input,request.count ?? 1);break; } catch { /* Only validated-output failures may consume the reserved repair budget. */ }
      }
      if (!payloads) throw new DomainError(503,'AI_INVALID_OUTPUT','AI повернув некоректний результат. Ідеї не збережено.');
      const validPayloads = payloads;
      await this.source.transaction(async manager => {
        const current = await manager.findOne(AiGenerationSession,{ where: { id: session.id },lock: { mode: 'pessimistic_write' } });
        if (!current || current.status !== 'RUNNING' || current.leaseExpiresAt.getTime() <= Date.now() || signal?.aborted) throw new DomainError(409,'GENERATION_CANCELLED','Результат прострочено або скасовано.');
        for (const [position,payload] of validPayloads.entries()) await manager.save(AiQuestSuggestion,manager.create(AiQuestSuggestion,{ sessionId: session.id,position,payload,validationStatus: 'VALIDATED',savedAt: null,convertedQuestId: null }));
        current.status = 'SUCCEEDED';current.completedAt = new Date();await manager.save(current);
        await this.audit.record(manager,userId,'AI_GENERATION_COMPLETED','ai_generation',session.id,{ requestId,count: validPayloads.length,latencyMs: Date.now()-session.createdAt.getTime(),attempts: current.attempts });
      });
    } catch (error) {
      const code = error instanceof DomainError && typeof error.getResponse() === 'object' ? this.errorCode(error) : 'AI_UNAVAILABLE';
      await this.source.transaction(async manager => {
        await manager.update(AiGenerationSession,{ id: session.id,status: 'RUNNING' },{ status: 'FAILED',errorCode: code,completedAt: new Date() });
        await this.audit.record(manager,userId,'AI_GENERATION_FAILED','ai_generation',session.id,{ requestId,errorCode: code });
      });
      throw error;
    }
    return this.response(userId,session.id);
  }
  private errorCode(error: DomainError): string {
    const response = error.getResponse();return typeof response === 'object' && 'code' in response && typeof response.code === 'string' ? response.code : 'AI_UNAVAILABLE';
  }
  private async owned(manager: EntityManager,userId: string,id: string,lock = false) {
    const session = await manager.findOne(AiGenerationSession,{ where: { id,userId },...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) });
    if (!session) throw new DomainError(404,'NOT_FOUND','Генерацію не знайдено.');return session;
  }
  private suggestionView(row: AiQuestSuggestion,session: AiGenerationSession): SuggestionDto {
    return { id: row.id,sessionId: row.sessionId,validationStatus: row.validationStatus,payload: session.retentionAt.getTime() > Date.now() ? row.payload : null,savedAt: row.savedAt?.toISOString() ?? null,convertedQuestId: row.convertedQuestId,createdAt: row.createdAt.toISOString(),isFixture: session.isFixture };
  }
  private sessionView(session: AiGenerationSession,suggestions: AiQuestSuggestion[]): GenerationSessionDto {
    const expired = session.status === 'RUNNING' && session.leaseExpiresAt.getTime() <= Date.now();
    return { id: session.id,status: expired ? 'FAILED' : session.status,provider: session.provider,model: session.model,isFixture: session.isFixture,attempts: session.attempts,errorCode: expired ? 'AI_LEASE_EXPIRED' : session.errorCode,createdAt: session.createdAt.toISOString(),completedAt: session.completedAt?.toISOString() ?? null,retentionAt: session.retentionAt.toISOString(),suggestions: suggestions.map(s => this.suggestionView(s,session)) };
  }
  async get(userId: string,id: string): Promise<GenerationSessionDto> { return this.source.transaction('REPEATABLE READ',async m => { const g = await this.owned(m,userId,id);return this.sessionView(g,await m.find(AiQuestSuggestion,{ where: { sessionId: id },order: { position: 'ASC' } })); }); }
  private async response(userId: string,id: string): Promise<GenerationResponseDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      const g = await this.owned(m,userId,id);
      if (g.retentionAt.getTime() <= Date.now() || !g.request) throw new DomainError(409,'GENERATION_EXPIRED','Вміст генерації видалено за політикою зберігання.');
      if (g.status !== 'SUCCEEDED') throw new DomainError(g.status === 'RUNNING' ? 409 : 503,g.status === 'RUNNING' ? 'GENERATION_IN_PROGRESS' : g.errorCode ?? 'AI_UNAVAILABLE','Переглянь стан генерації. Повтор цього ключа не викликає AI.');
      const suggestion = await m.findOneByOrFail(AiQuestSuggestion,{ sessionId: id,position: 0 });
      const payload = generatedPayloadSchema.parse(suggestion.payload);
      if (g.isFixture) throw new DomainError(409,'AI_FIXTURE','Це навчальний fixture, а не виклик AI.');
      return { schemaVersion: 1,provider: 'remote-ai',generationId: id,suggestionId: suggestion.id,values: draftValues(payload,g.request.input),warnings: [...aiWarnings,...payload.uncertaintyNotes] };
    });
  }
  list(userId: string,q: AiPageQueryDto): Promise<GenerationPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      const [sessions,total] = await m.findAndCount(AiGenerationSession,{ where: { userId },order: { createdAt: q.order,id: q.order },skip: (q.page-1)*q.pageSize,take: q.pageSize });
      const suggestions = sessions.length ? await m.find(AiQuestSuggestion,{ where: { sessionId: In(sessions.map(s => s.id)) },order: { position: 'ASC' } }) : [];
      return { items: sessions.map(g => this.sessionView(g,suggestions.filter(s => s.sessionId === g.id))),total,page: q.page,pageSize: q.pageSize };
    });
  }
  async suggestion(userId: string,id: string): Promise<SuggestionDto> { return this.source.transaction('REPEATABLE READ',async m => { const s = await m.findOneBy(AiQuestSuggestion,{ id });if (!s) throw new DomainError(404,'NOT_FOUND','Ідею не знайдено.');return this.suggestionView(s,await this.owned(m,userId,s.sessionId)); }); }
  async regenerate(userId: string,id: string,key: string,requestId: string | null,signal?: AbortSignal) {
    const data = await this.source.transaction('REPEATABLE READ',async m => {
      const s = await m.findOneBy(AiQuestSuggestion,{ id });if (!s) throw new DomainError(404,'NOT_FOUND','Ідею не знайдено.');const g = await this.owned(m,userId,s.sessionId);
      if (!g.request || g.retentionAt.getTime() <= Date.now()) throw new DomainError(409,'GENERATION_EXPIRED','Термін зберігання минув.');return g.request;
    });
    return this.generate(userId,key,data,requestId,signal);
  }
  save(userId: string,id: string) {
    return this.source.transaction(async m => {
      const s = await m.findOne(AiQuestSuggestion,{ where: { id },lock: { mode: 'pessimistic_write' } });if (!s) throw new DomainError(404,'NOT_FOUND','Ідею не знайдено.');
      const g = await this.owned(m,userId,s.sessionId);if (!s.payload || g.retentionAt.getTime() <= Date.now()) throw new DomainError(409,'GENERATION_EXPIRED','Термін зберігання минув.');
      if (!s.savedAt) { s.savedAt = new Date();await m.save(s);await this.audit.record(m,userId,'AI_IDEA_SAVED','ai_suggestion',id); }return this.suggestionView(s,g);
    });
  }
  saved(userId: string,q: AiPageQueryDto): Promise<SuggestionPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      const [items,total] = await m.createQueryBuilder(AiQuestSuggestion,'s').innerJoin(AiGenerationSession,'g','g.id=s.session_id').where('g.user_id=:userId AND s.saved_at IS NOT NULL AND g.retention_at>now()',{ userId }).orderBy('s.createdAt',q.order).addOrderBy('s.id',q.order).skip((q.page-1)*q.pageSize).take(q.pageSize).getManyAndCount();
      const sessions = items.length ? await m.findBy(AiGenerationSession,{ id: In(items.map(s => s.sessionId)) }) : [];
      return { items: items.map(s => { const g = sessions.find(g => g.id === s.sessionId);if (!g) throw new Error('Missing session');return this.suggestionView(s,g); }),total,page: q.page,pageSize: q.pageSize };
    });
  }
  convert(userId: string,id: string,organizationId: string) {
    return this.source.transaction(async m => {
      const user = await this.actor(m,userId);if (!user.roles.includes(Role.ORGANIZER)) throw new DomainError(403,'FORBIDDEN','Потрібна роль організатора.');
      await this.access.requireCapability(m,organizationId,userId,'manage');
      const suggestion = await m.findOne(AiQuestSuggestion,{ where: { id },lock: { mode: 'pessimistic_write' } });if (!suggestion) throw new DomainError(404,'NOT_FOUND','Ідею не знайдено.');
      const g = await this.owned(m,userId,suggestion.sessionId);
      if (g.organizationId && g.organizationId !== organizationId) throw new DomainError(409,'ORGANIZATION_SCOPE_REQUIRED','Ідея належить іншій організації.');
      if (suggestion.convertedQuestId) { const q = await m.findOneBy(Quest,{ id: suggestion.convertedQuestId,organizationId });if (!q) throw new DomainError(409,'IDEMPOTENCY_CONFLICT','Чернетку вже створено в іншій організації.');return managedQuest(q,await occupied(m,q.id),false); }
      if (!g.request || !suggestion.payload || g.retentionAt.getTime() <= Date.now()) throw new DomainError(409,'GENERATION_EXPIRED','Термін зберігання минув.');
      const payload = generatedPayloadSchema.parse(suggestion.payload),values = draftValues(payload,g.request.input);
      const quest = await this.quests.createWithin(m,userId,{ organizationId,title: values.title,description: values.description,fullDescription: values.fullDescription,categoryId: payload.category,difficulty: payload.difficulty,capacity: payload.requiredVolunteers,xp: 150,rewardPoints: 75,district: payload.suggestedDistrict,address: '',startAt: null,endAt: null,requirements: payload.requirements,bring: [],instructions: values.instructions,image: values.image,imageAlt: payload.title,locationId: '',allowTeamParticipation: values.allowTeamParticipation,teamParticipantLimit: values.teamParticipantLimit ?? null });
      suggestion.convertedQuestId = quest.id;await m.save(suggestion);await this.audit.record(m,userId,'AI_IDEA_CONVERTED','ai_suggestion',id,{ questId: quest.id,organizationId,isFixture: g.isFixture });return quest;
    });
  }
}
