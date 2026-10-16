import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Transactions } from '../database/database.module.js';
import { TeamAccess } from '../teams/team-access.service.js';
import { TeamMembership } from '../teams/team.entity.js';
import { QuestPolicy, occupied } from '../quests/quest.policy.js';
import { DomainError } from '../common/http.js';
import { AuditService } from '../audit/audit.service.js';
import { ParticipationsService } from '../participations/participations.service.js';
import { ParticipationQueries } from '../participations/participation.queries.js';
import { QuestApplication } from '../participations/participation.entity.js';
import { ApplicationStatus } from '../quests/domain.js';
import { TeamQuestApplication, TeamQuestApplicationMember } from './team-application.entity.js';
import type { TeamApplicationInputDto, TeamApplicationDto, TeamApplicationPageDto, TeamHistoryQueryDto } from '../teams/team.dto.js';
import { rows, text } from '../progress/sql.js';
@Injectable()
export class TeamApplicationsService {
  constructor(private readonly source: DataSource,private readonly transactions: Transactions,private readonly teams: TeamAccess,private readonly quests: QuestPolicy,private readonly participations: ParticipationsService,private readonly queries: ParticipationQueries,private readonly audit: AuditService) {}
  private async project(manager: EntityManager,groups: TeamQuestApplication[]): Promise<TeamApplicationDto[]> {
    if (!groups.length) return [];
    const ids = groups.map(g => g.id);
    const facts = rows(await manager.query(`SELECT m.*,a.status AS application_status,a.team_application_id AS current_group,p.status AS participation_status,p.id AS participation_id,p.team_application_id AS participation_group FROM team_quest_application_members m JOIN quest_applications a ON a.id=m.application_id LEFT JOIN participations p ON p.application_id=a.id WHERE m.team_application_id=ANY($1::uuid[]) ORDER BY m.user_id`,[ids]));
    const statuses = rows(await manager.query('SELECT id,computed_status FROM team_application_progress WHERE id=ANY($1::uuid[])',[ids]));
    return groups.map(g => ({ id: g.id,teamId: g.teamId,questId: g.questId,submittedByUserId: g.submittedByUserId,status: text(statuses.find(r => r.id === g.id)?.computed_status),participantCount: g.participantCount,submittedAt: g.submittedAt.toISOString(),reviewedAt: g.reviewedAt?.toISOString() ?? null,reviewedBy: g.reviewedByUserId,reviewReason: g.reviewReason,participants: facts.filter(r => r.team_application_id === g.id).map(r => ({ userId: text(r.user_id),membershipId: text(r.membership_id),applicationId: text(r.application_id),participantStatus: r.current_group !== g.id ? 'cancelled' : r.application_status !== 'approved' ? text(r.application_status) : r.participation_group === g.id ? text(r.participation_status) : 'cancelled',participationId: r.participation_group === g.id ? text(r.participation_id) : null })) }));
  }
  private async view(manager: EntityManager,group: TeamQuestApplication): Promise<TeamApplicationDto> {
    const first = (await this.project(manager,[group]))[0];if (!first) throw new Error('Missing team application');return first;
  }
  async applyWithin(manager: EntityManager,actorId: string,questId: string,input: TeamApplicationInputDto): Promise<TeamApplicationDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Team applications require a transaction');
    const { quest,organization } = await this.quests.lock(manager,questId);
    const team = await this.teams.lock(manager,input.teamId,false);await this.teams.require(manager,team.id,actorId,'apply');
    const ids = input.participantIds.slice().sort();
    const old = await manager.findOneBy(TeamQuestApplication,{ teamId: team.id,operationId: input.operationId });
    if (old) {
      const previous = (await manager.find(TeamQuestApplicationMember,{ where: { teamApplicationId: old.id } })).map(m => m.userId).sort();
      if (old.questId !== questId || old.submittedByUserId !== actorId || previous.join(',') !== ids.join(',')) throw new DomainError(409,'IDEMPOTENCY_CONFLICT','Ключ операції вже використаний для іншої заявки.');
      return this.view(manager,old);
    }
    if (team.status !== 'ACTIVE') throw new DomainError(409,'TEAM_ARCHIVED','Команду архівовано.');
    this.quests.available(quest,organization);
    if (!quest.allowTeamParticipation || !quest.teamParticipantLimit) throw new DomainError(409,'TEAM_PARTICIPATION_DISABLED','Квест не дозволяє командні заявки.');
    if (!ids.length || new Set(ids).size !== ids.length || ids.length > quest.teamParticipantLimit) throw new DomainError(422,'INVALID_TEAM_ROSTER','Перевір склад і ліміт командної заявки.');
    if (await occupied(manager,questId)+ids.length > quest.capacity) throw new DomainError(409,'CAPACITY_EXCEEDED','Недостатньо вільних місць для всіх учасників.');
    const selected: TeamMembership[] = [];
    for (const userId of ids) {
      await this.teams.volunteer(manager,userId);const membership = await this.teams.membership(manager,team.id,userId);
      if (!membership) throw new DomainError(409,'TEAM_MEMBERSHIP_REQUIRED','Усі вибрані волонтери мають бути активними учасниками команди.');selected.push(membership);
      const app = await manager.findOneBy(QuestApplication,{ questId,userId });
      if (app && app.status !== ApplicationStatus.WITHDRAWN) throw new DomainError(409,'DUPLICATE_APPLICATION','Хтось із вибраних учасників уже має заявку або відмову на цей квест.');
    }
    const group = await manager.save(TeamQuestApplication,manager.create(TeamQuestApplication,{ teamId: team.id,questId,submittedByUserId: actorId,operationId: input.operationId,status: 'PENDING',participantCount: ids.length,reviewedAt: null,reviewedByUserId: null,reviewReason: null }));
    for (const member of selected) {
      const app = await this.participations.applyWithin(manager,member.userId,questId,group.id,actorId);
      await manager.save(TeamQuestApplicationMember,manager.create(TeamQuestApplicationMember,{ teamApplicationId: group.id,teamId: team.id,questId,userId: member.userId,membershipId: member.id,applicationId: app.id }));
    }
    await this.audit.record(manager,actorId,'TEAM_QUEST_APPLIED','team_quest_application',group.id,{ teamId: team.id,questId,participantCount: ids.length });return this.view(manager,group);
  }
  apply(actorId: string,questId: string,input: TeamApplicationInputDto) { return this.transactions.run(m => this.applyWithin(m,actorId,questId,input)); }
  async reviewWithin(manager: EntityManager,actorId: string,id: string,approve: boolean,reason: string | null): Promise<TeamApplicationDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Team application review requires a transaction');
    const reference = await manager.findOneBy(TeamQuestApplication,{ id });if (!reference) throw new DomainError(404,'NOT_FOUND','Командну заявку не знайдено.');
    await this.quests.lock(manager,reference.questId,actorId,'verify');
    const group = await manager.findOneByOrFail(TeamQuestApplication,{ id });
    const members = await manager.find(TeamQuestApplicationMember,{ where: { teamApplicationId: id },order: { userId: 'ASC' } });
    const target = approve ? 'APPROVED' : 'REJECTED';
    if (group.status === target) return this.view(manager,group);
    if (group.status !== 'PENDING') throw new DomainError(409,'APPLICATION_RESOLVED','Командну заявку вже опрацьовано.');
    for (const member of members) {
      const app = await manager.findOneByOrFail(QuestApplication,{ id: member.applicationId });
      if (app.teamApplicationId !== group.id) throw new DomainError(409,'TEAM_ROSTER_CHANGED','Участь уже віднесена до іншої заявки.');
      await this.participations.reviewWithin(manager,actorId,member.applicationId,approve,reason);
    }
    group.status = target;group.reviewedAt = new Date();group.reviewedByUserId = actorId;group.reviewReason = reason;await manager.save(group);
    await this.audit.record(manager,actorId,`TEAM_APPLICATION_${target}`,'team_quest_application',id);return this.view(manager,group);
  }
  review(actorId: string,id: string,approve: boolean,reason: string | null) { return this.transactions.run(m => this.reviewWithin(m,actorId,id,approve,reason)); }
  withdraw(actorId: string,id: string): Promise<TeamApplicationDto> {
    return this.transactions.run(async manager => {
      const reference = await manager.findOneBy(TeamQuestApplication,{ id });if (!reference) throw new DomainError(404,'NOT_FOUND','Командну заявку не знайдено.');
      await this.quests.lock(manager,reference.questId);await this.teams.lock(manager,reference.teamId);await this.teams.require(manager,reference.teamId,actorId,'apply');
      const group = await manager.findOneByOrFail(TeamQuestApplication,{ id });
      if (group.status === 'CANCELLED') return this.view(manager,group);
      if (group.status === 'REJECTED') throw new DomainError(409,'APPLICATION_RESOLVED','Відхилена заявка зберігається в історії.');
      const members = await manager.find(TeamQuestApplicationMember,{ where: { teamApplicationId: id },order: { userId: 'ASC' } });
      for (const member of members) {
        const app = await manager.findOneByOrFail(QuestApplication,{ id: member.applicationId });
        if (app.teamApplicationId !== id) continue;
        if (app.status === ApplicationStatus.REJECTED) continue;
        await this.participations.withdrawWithin(manager,member.userId,member.applicationId,actorId);
      }
      group.status = 'CANCELLED';await manager.save(group);await this.audit.record(manager,actorId,'TEAM_APPLICATION_WITHDRAWN','team_quest_application',id);return this.view(manager,group);
    });
  }
  list(actorId: string,input: TeamHistoryQueryDto,scope: { teamId: string } | { questId: string }): Promise<TeamApplicationPageDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      if ('teamId' in scope) await this.teams.require(manager,scope.teamId,actorId);else await this.queries.readScope(manager,actorId,scope.questId);
      const [items,total] = await manager.findAndCount(TeamQuestApplication,{ where: scope,order: { submittedAt: input.order,id: input.order },skip: (input.page-1)*input.pageSize,take: input.pageSize });
      return { items: await this.project(manager,items),total,page: input.page,pageSize: input.pageSize };
    });
  }
}
