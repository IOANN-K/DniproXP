import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { TeamAccess } from '../teams/team-access.service.js';
import { TeamMembership } from '../teams/team.entity.js';
import { TeamQuestApplication, TeamQuestApplicationMember } from '../team-applications/team-application.entity.js';
import { Role } from '../database/entities/domain.js';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import {
  QuestPolicy,
  conflict,
  occupied,
  openLifecycles,
} from '../quests/quest.policy.js';
import {
  ApplicationStatus,
  ParticipationStatus,
  QuestLifecycle,
  QuestModeration,
  ReportStatus,
} from '../quests/domain.js';
import {
  QuestApplication,
  Participation,
  ParticipationReport,
} from './participation.entity.js';
import { ParticipationQueries } from './participation.queries.js';
import { applicationView, reportView } from './participation.mapper.js';
import type {
  ApplicationDto,
  ParticipationDto,
  CreateReportDto,
  ReportDto,
} from './participation.dto.js';
import {
  applicationTransition,
  participationTransition,
} from './participation.policy.js';
@Injectable()
export class ParticipationsService {
  constructor(
    private readonly source: DataSource,
    private readonly transactions: Transactions,
    private readonly policy: QuestPolicy,
    private readonly queries: ParticipationQueries,
    private readonly audit: AuditService,
    private readonly teams: TeamAccess,
  ) {}
  apply(userId: string, questId: string): Promise<ApplicationDto> {
    return this.transactions.run(manager => this.applyWithin(manager,userId,questId));
  }
  async applyWithin(manager: EntityManager,userId: string,questId: string,teamApplicationId: string | null = null,actorId = userId): Promise<ApplicationDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Applications require a transaction');
      const { quest, organization } = await this.policy.lock(manager, questId);
      await this.policy.activeUser(manager, userId);
      this.policy.available(quest, organization);
      const old = await manager.findOne(QuestApplication, {
        where: { userId, questId },
        lock: { mode: 'pessimistic_write' },
      });
      if (teamApplicationId && old && old.status !== ApplicationStatus.WITHDRAWN) conflict('Волонтер уже має заявку на цей квест.','DUPLICATE_APPLICATION');
      if (
        old &&
        [ApplicationStatus.PENDING, ApplicationStatus.APPROVED].includes(
          old.status,
        )
      )
        return applicationView(
          old,
          await this.queries.questSnapshot(manager, questId),
        );
      if (old?.status === ApplicationStatus.REJECTED)
        conflict(
          'Відхилену заявку повторно подати не можна.',
          'APPLICATION_REJECTED',
        );
      if ((await occupied(manager, questId)) >= quest.capacity)
        conflict('Усі місця зайняті.', 'CAPACITY_EXCEEDED');
      const application =
        old ?? manager.create(QuestApplication, { userId, questId });
      if (old) applicationTransition(old.status, ApplicationStatus.PENDING);
      application.teamApplicationId = teamApplicationId;
      application.status = ApplicationStatus.PENDING;
      application.submittedAt = new Date();
      application.reviewedAt = null;
      application.reviewedByUserId = null;
      application.reason = null;
      await manager.save(application);
      await this.audit.record(
        manager,
        actorId,
        'APPLICATION_SUBMITTED',
        'quest_application',
        application.id,
        { questId,userId },
      );
      return applicationView(
        application,
        await this.queries.questSnapshot(manager, questId),
      );
  }
  review(actorId: string,id: string,approve: boolean,reason: string | null): Promise<ApplicationDto> {
    return this.transactions.run(manager => this.reviewWithin(manager,actorId,id,approve,reason));
  }
  async reviewWithin(manager: EntityManager,actorId: string,id: string,approve: boolean,reason: string | null): Promise<ApplicationDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Review requires a transaction');
    const ref = await manager.findOneBy(QuestApplication, { id });
    if (!ref) throw new DomainError(404, 'NOT_FOUND', 'Заявку не знайдено.');
    
      const { quest, organization } = await this.policy.lock(
        manager,
        ref.questId,
        actorId,
        'verify',
      );
      const app = await manager.findOne(QuestApplication, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!app) throw new DomainError(404, 'NOT_FOUND', 'Заявку не знайдено.');
      if (actorId === app.userId)
        throw new DomainError(
          403,
          'SELF_REVIEW_FORBIDDEN',
          'Не можна розглядати власну заявку.',
        );
      const target = approve
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;
      if (app.status === target)
        return applicationView(
          app,
          await this.queries.questSnapshot(manager, quest.id),
        );
      if (app.status !== ApplicationStatus.PENDING)
        conflict('Заявку вже розглянуто.');
      if (approve) this.policy.available(quest, organization);
      else if (
        !openLifecycles.includes(quest.lifecycle) ||
        quest.moderation !== QuestModeration.APPROVED
      )
        conflict('Квест недоступний для розгляду заявок.');
      if (!approve && (!reason || reason.trim().length < 5))
        conflict('Вкажи причину відхилення.', 'REASON_REQUIRED');
      if (approve) {
        await this.policy.activeUser(manager, app.userId);
        if (app.teamApplicationId) {
          const group = await manager.findOneByOrFail(TeamQuestApplication,{ id: app.teamApplicationId });
          await this.teams.lock(manager,group.teamId);
          const selection = await manager.findOneBy(TeamQuestApplicationMember,{ teamApplicationId: group.id,userId: app.userId });
          if (!selection || !(await manager.existsBy(TeamMembership,{ id: selection.membershipId,status: 'ACTIVE' }))) conflict('Членство вибраного учасника вже завершено.','TEAM_MEMBERSHIP_ENDED');
        }
        if ((await occupied(manager, quest.id)) > quest.capacity)
          conflict('Місткість квесту вичерпано.', 'CAPACITY_EXCEEDED');
        const old = await manager.findOne(Participation, {
          where: { applicationId: id },
          lock: { mode: 'pessimistic_write' },
        });
        if (old && old.status !== ParticipationStatus.CANCELLED)
          conflict('Участь уже існує.');
        const p =
          old ??
          manager.create(Participation, {
            applicationId: id,
            userId: app.userId,
            questId: quest.id,
            confirmedAt: null,
          });
        const nextStatus =
          quest.startAt && quest.startAt.getTime() <= Date.now()
            ? ParticipationStatus.ACTIVE
            : ParticipationStatus.PLANNED;
        if (old) participationTransition(old.status, nextStatus);
        p.teamApplicationId = app.teamApplicationId ?? null;
        p.status = nextStatus;
        await manager.save(p);
        if (
          p.status === ParticipationStatus.ACTIVE &&
          quest.lifecycle === QuestLifecycle.PUBLISHED
        ) {
          quest.lifecycle = QuestLifecycle.ACTIVE;
          await manager.save(quest);
        }
      }
      applicationTransition(app.status, target);
      app.status = target;
      app.reviewedAt = new Date();
      app.reviewedByUserId = actorId;
      app.reason = reason;
      await manager.save(app);
      await this.audit.record(
        manager,
        actorId,
        approve ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
        'quest_application',
        id,
        { questId: quest.id, reason },
      );
      return applicationView(
        app,
        await this.queries.questSnapshot(manager, quest.id),
      );
  }
  withdraw(userId: string,id: string): Promise<ApplicationDto> {
    return this.transactions.run(manager => this.withdrawWithin(manager,userId,id));
  }
  async withdrawWithin(manager: EntityManager,userId: string,id: string,actorId = userId): Promise<ApplicationDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Withdrawal requires a transaction');
    const ref = await manager.findOneBy(QuestApplication, { id });
    if (!ref || ref.userId !== userId)
      throw new DomainError(404, 'NOT_FOUND', 'Заявку не знайдено.');
    
      const { quest } = await this.policy.lock(manager, ref.questId);
      const app = await manager.findOne(QuestApplication, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!app) throw new DomainError(404, 'NOT_FOUND', 'Заявку не знайдено.');
      if (app.status === ApplicationStatus.WITHDRAWN)
        return applicationView(
          app,
          await this.queries.questSnapshot(manager, quest.id),
        );
      const p = await manager.findOne(Participation, {
        where: { applicationId: id },
        lock: { mode: 'pessimistic_write' },
      });
      const approvedWithdrawal =
        app.status === ApplicationStatus.APPROVED &&
        p?.status === ParticipationStatus.PLANNED &&
        !!quest.startAt &&
        quest.startAt.getTime() > Date.now();
      if (
        !openLifecycles.includes(quest.lifecycle) ||
        (app.status !== ApplicationStatus.PENDING && !approvedWithdrawal)
      )
        conflict(
          'Можна відкликати лише pending-заявку або заплановану участь до початку.',
        );
      applicationTransition(app.status, ApplicationStatus.WITHDRAWN);
      app.status = ApplicationStatus.WITHDRAWN;
      app.reason = 'Волонтер відкликав заявку.';
      await manager.save(app);
      if (p && p.status !== ParticipationStatus.CANCELLED) {
        participationTransition(p.status, ParticipationStatus.CANCELLED);
        p.status = ParticipationStatus.CANCELLED;
        await manager.save(p);
      }
      await this.audit.record(
        manager,
        actorId,
        'APPLICATION_WITHDRAWN',
        'quest_application',
        id,
        { questId: quest.id },
      );
      return applicationView(
        app,
        await this.queries.questSnapshot(manager, quest.id),
      );
  }
  async start(userId: string, id: string): Promise<ParticipationDto> {
    const ref = await this.source.manager.findOneBy(Participation, {
      id,
      userId,
    });
    if (!ref) throw new DomainError(404, 'NOT_FOUND', 'Участь не знайдено.');
    return this.transactions.run(async (manager) => {
      const { quest, organization } = await this.policy.lock(
        manager,
        ref.questId,
      );
      this.policy.available(quest, organization);
      const app = await manager.findOne(QuestApplication, {
        where: { id: ref.applicationId },
        lock: { mode: 'pessimistic_write' },
      });
      const p = await manager.findOne(Participation, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p) throw new DomainError(404, 'NOT_FOUND', 'Участь не знайдено.');
      if (
        app?.status !== ApplicationStatus.APPROVED ||
        !quest.startAt ||
        quest.startAt.getTime() > Date.now()
      )
        conflict('Потрібна схвалена заявка і час початку квесту.');
      if (p.status === ParticipationStatus.ACTIVE)
        return this.queries.participationView(manager, p);
      if (p.status !== ParticipationStatus.PLANNED)
        conflict('Участь недоступна для початку.');
      participationTransition(p.status, ParticipationStatus.ACTIVE);
      p.status = ParticipationStatus.ACTIVE;
      await manager.save(p);
      if (quest.lifecycle === QuestLifecycle.PUBLISHED) {
        quest.lifecycle = QuestLifecycle.ACTIVE;
        await manager.save(quest);
      }
      await this.audit.record(
        manager,
        userId,
        'PARTICIPATION_STARTED',
        'participation',
        id,
      );
      return this.queries.participationView(manager, p);
    });
  }
  async cancel(
    actorId: string,
    id: string,
    reason?: string,
  ): Promise<ParticipationDto> {
    const ref = await this.source.manager.findOneBy(Participation, { id });
    if (!ref) throw new DomainError(404, 'NOT_FOUND', 'Участь не знайдено.');
    return this.transactions.run(async (manager) => {
      const { quest } = await this.policy.lock(manager, ref.questId);
      const app = await manager.findOne(QuestApplication, {
        where: { id: ref.applicationId },
        lock: { mode: 'pessimistic_write' },
      });
      const p = await manager.findOne(Participation, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p || !app)
        throw new DomainError(404, 'NOT_FOUND', 'Участь не знайдено.');
      // Read current state under lock; a concurrent approval/cancellation must not use the preflight snapshot.
      if (p.userId === actorId && p.status === ParticipationStatus.CANCELLED)
        return this.queries.participationView(manager, p);
      if (p.userId === actorId && p.status === ParticipationStatus.COMPLETED)
        conflict('Підтверджена участь зберігається в історії.');
      const ownPlanned =
        p.userId === actorId &&
        p.status === ParticipationStatus.PLANNED &&
        !!quest.startAt &&
        quest.startAt.getTime() > Date.now();
      if (!ownPlanned) {
        const actor = await this.policy.activeUser(manager, actorId);
        if (!actor.roles.includes(Role.ORGANIZER))
          throw new DomainError(
            403,
            'FORBIDDEN',
            'Потрібні повноваження організатора.',
          );
        await this.policy.lock(manager, ref.questId, actorId, 'manage');
      }
      if (p.status === ParticipationStatus.COMPLETED)
        conflict('Підтверджена участь зберігається в історії.');
      if (p.status === ParticipationStatus.CANCELLED)
        return this.queries.participationView(manager, p);
      if (!openLifecycles.includes(quest.lifecycle))
        conflict('Участь цього квесту вже закрито.');
      if (!ownPlanned && !reason)
        conflict('Вкажи причину скасування.', 'REASON_REQUIRED');
      if (ownPlanned) {
        applicationTransition(app.status, ApplicationStatus.WITHDRAWN);
        app.status = ApplicationStatus.WITHDRAWN;
        app.reason = 'Волонтер скасував заплановану участь.';
        await manager.save(app);
      }
      participationTransition(p.status, ParticipationStatus.CANCELLED);
      p.status = ParticipationStatus.CANCELLED;
      await manager.save(p);
      await this.audit.record(
        manager,
        actorId,
        'PARTICIPATION_CANCELLED',
        'participation',
        id,
        { reason: reason ?? null },
      );
      return this.queries.participationView(manager, p);
    });
  }
  submitReport(userId: string,id: string,input: CreateReportDto): Promise<ReportDto> {
    return this.transactions.run(manager => this.submitReportWithin(manager,userId,id,input));
  }
  async submitReportWithin(manager: EntityManager,userId: string,id: string,input: CreateReportDto): Promise<ReportDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Reports require a transaction');
    if (input.evidenceReferences?.length)
      throw new DomainError(
        422,
        'EVIDENCE_NOT_SUPPORTED',
        'Завантаження доказів буде доступне після підключення захищеного media storage.',
      );
    const ref = await manager.findOneBy(Participation, {
      id,
      userId,
    });
    if (!ref) throw new DomainError(404, 'NOT_FOUND', 'Участь не знайдено.');
    
      const { quest, organization } = await this.policy.lock(
        manager,
        ref.questId,
      );
      if (
        !openLifecycles.includes(quest.lifecycle) ||
        quest.moderation !== QuestModeration.APPROVED ||
        organization.moderationStatus !== 'approved' ||
        !quest.startAt ||
        quest.startAt.getTime() > Date.now()
      )
        conflict('Звіт доступний для схваленої участі після початку квесту.');
      const app = await manager.findOne(QuestApplication, {
        where: { id: ref.applicationId },
        lock: { mode: 'pessimistic_write' },
      });
      const p = await manager.findOne(Participation, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !p ||
        app?.status !== ApplicationStatus.APPROVED ||
        ![ParticipationStatus.PLANNED, ParticipationStatus.ACTIVE].includes(
          p.status,
        )
      )
        conflict('Немає активної участі для подання звіту.');
      const report = await manager.save(
        ParticipationReport,
        manager.create(ParticipationReport, {
          participationId: id,
          submittedByUserId: userId,
          description: input.description,
          reportedMinutes: input.reportedMinutes ?? null,
          evidenceReferences: [],
          status: ReportStatus.SUBMITTED,
          reviewedAt: null,
          reviewedByUserId: null,
          reviewReason: null,
        }),
      );
      participationTransition(p.status, ParticipationStatus.PENDING);
      p.status = ParticipationStatus.PENDING;
      await manager.save(p);
      if (quest.lifecycle === QuestLifecycle.PUBLISHED) {
        quest.lifecycle = QuestLifecycle.ACTIVE;
        await manager.save(quest);
      }
      await this.audit.record(
        manager,
        userId,
        'REPORT_SUBMITTED',
        'participation_report',
        report.id,
        { participationId: id },
      );
      return reportView(report);
  }
}
