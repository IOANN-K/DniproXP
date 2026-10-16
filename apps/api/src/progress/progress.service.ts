import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import { MissionProgressEngine } from '../missions/mission-progress.engine.js';
import { ChallengeProgressEngine } from '../challenges/challenge-progress.engine.js';
import { missionView, challengeView } from './definition.service.js';
import { MissionDefinition, ChallengeDefinition, MissionEnrollment, ChallengeParticipant, ProgressRewardClaim } from './definition.entity.js';
import { lockVolunteer } from './reward-claims.service.js';
import type { ProgressQueryDto, UserMissionPageDto, UserChallengePageDto, MissionProgressDto, UserChallengeDto, ChallengePageDto, ChallengeDefinitionDto } from './progress.dto.js';
import { numeric, rows, text } from './sql.js';

@Injectable()
export class ProgressService {
  constructor(
    private readonly source: DataSource,
    private readonly transactions: Transactions,
    private readonly missions: MissionProgressEngine,
    private readonly challenges: ChallengeProgressEngine,
    private readonly audit: AuditService,
  ) {}

  async publicChallenges(query: ProgressQueryDto): Promise<ChallengePageDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const selection = manager.createQueryBuilder(ChallengeDefinition, 'd').where("d.status<>'DRAFT'");
      if (query.category && query.category !== 'all') selection.andWhere('d.category=:category', { category: query.category });
      if (query.search) selection.andWhere('d.title ILIKE :search', { search: `%${query.search.replace(/[\\%_]/g, '\\$&')}%` });
      const [definitions, total] = await selection.orderBy('d.createdAt', query.order).addOrderBy('d.id', query.order).skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
      const projections = await this.challenges.batch(manager, definitions);
      return {
        items: definitions.map(definition => {
          const progress = projections.get(definition.id);
          if (!progress) throw new Error('Missing challenge projection');
          return { ...challengeView(definition), status: progress.status };
        }), total, page: query.page, pageSize: query.pageSize,
      };
    });
  }

  async publicChallenge(id: string): Promise<ChallengeDefinitionDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const definition = await manager.findOneBy(ChallengeDefinition, { id });
      if (!definition || definition.status === 'DRAFT') throw new DomainError(404, 'NOT_FOUND', 'Виклик не знайдено.');
      return { ...challengeView(definition), status: (await this.challenges.calculate(manager, definition)).status };
    });
  }

  async ownMissions(userId: string, query: ProgressQueryDto): Promise<UserMissionPageDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const context = await this.missions.context(manager, userId);
      const filtered = context.definitions.filter(d => d.status !== 'DRAFT' && (!query.category || query.category === 'all' || d.category === query.category) && (!query.search || d.title.toLocaleLowerCase('uk').includes(query.search.toLocaleLowerCase('uk'))));
      filtered.sort((a, b) => (query.order === 'ASC' ? 1 : -1) * (a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)));
      const memo = new Map<string, MissionProgressDto>();
      return { items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map(d => ({ mission: missionView(d), progress: this.missions.calculate(d, userId, context, memo) })), total: filtered.length, page: query.page, pageSize: query.pageSize };
    });
  }

  async ownChallenges(userId: string, query: ProgressQueryDto): Promise<UserChallengePageDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const selection = manager.createQueryBuilder(ChallengeDefinition, 'd').where("d.status<>'DRAFT'");
      if (query.category && query.category !== 'all') selection.andWhere('d.category=:category', { category: query.category });
      if (query.search) selection.andWhere('d.title ILIKE :search', { search: `%${query.search.replace(/[\\%_]/g, '\\$&')}%` });
      const [definitions, total] = await selection.orderBy('d.createdAt', query.order).addOrderBy('d.id', query.order).skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
      const ids = definitions.map(d => d.id);
      const enrolled = new Set((ids.length ? await manager.find(ChallengeParticipant, { where: { userId, challengeId: In(ids) } }) : []).map(p => p.challengeId));
      const claimed = new Set((ids.length ? await manager.find(ProgressRewardClaim, { where: { userId, kind: 'challenge', definitionId: In(ids) } }) : []).map(c => c.definitionId));
      const own = ids.length ? rows(await manager.query('SELECT challenge_id, sum(verified_minutes)::text AS minutes,count(DISTINCT quest_id)::text AS quests FROM challenge_eligible_activities WHERE participant_user_id=$1 AND challenge_id=ANY($2::uuid[]) GROUP BY challenge_id', [userId, ids])) : [];
      const projections = await this.challenges.batch(manager, definitions);
      const items: UserChallengeDto[] = definitions.map(challenge => {
        const contribution = own.find(r => text(r.challenge_id) === challenge.id), progress = projections.get(challenge.id);
        if (!progress) throw new Error('Missing challenge projection');
        return { challenge: { ...challengeView(challenge), status: progress.status }, progress, enrolled: enrolled.has(challenge.id), rewardClaimed: claimed.has(challenge.id), ownHours: contribution ? numeric(contribution.minutes) / 60 : 0, ownQuests: contribution ? numeric(contribution.quests) : 0 };
      });
      return { items, total, page: query.page, pageSize: query.pageSize };
    });
  }

  enroll(userId: string, id: string): Promise<MissionProgressDto> {
    return this.transactions.run(async manager => {
      await lockVolunteer(manager, userId);
      const definition = await manager.findOne(MissionDefinition, { where: { id }, lock: { mode: 'for_no_key_update' } });
      if (!definition || definition.status === 'DRAFT') throw new DomainError(404, 'NOT_FOUND', 'Місію не знайдено.');
      const context = await this.missions.context(manager, userId);
      const progress = this.missions.calculate(definition, userId, context);
      if (context.enrolled.has(id)) return progress;
      if (!['AVAILABLE', 'IN_PROGRESS'].includes(progress.status))
        throw new DomainError(409, 'MISSION_UNAVAILABLE', 'Місія недоступна для початку.');
      await manager.save(MissionEnrollment, manager.create(MissionEnrollment, { missionId: id, userId }));
      await this.audit.record(manager, userId, 'MISSION_ENROLLED', 'mission', id);
      context.enrolled.add(id);
      return this.missions.calculate(definition, userId, context);
    });
  }

  join(userId: string, id: string): Promise<{ challengeId: string; enrolled: true }> {
    return this.transactions.run<{ challengeId: string; enrolled: true }>(async manager => {
      await lockVolunteer(manager, userId);
      const definition = await manager.findOne(ChallengeDefinition, { where: { id }, lock: { mode: 'for_no_key_update' } });
      if (!definition || definition.status === 'DRAFT') throw new DomainError(404, 'NOT_FOUND', 'Виклик не знайдено.');
      if (await manager.existsBy(ChallengeParticipant, { challengeId: id, userId })) return { challengeId: id, enrolled: true };
      const progress = await this.challenges.calculate(manager, definition);
      if (progress.status !== 'ACTIVE') throw new DomainError(409, 'CHALLENGE_UNAVAILABLE', 'Долучитися можна лише до активного виклику.');
      await manager.save(ChallengeParticipant, manager.create(ChallengeParticipant, { challengeId: id, userId }));
      await this.audit.record(manager, userId, 'CHALLENGE_JOINED', 'challenge', id);
      return { challengeId: id, enrolled: true };
    });
  }
}
