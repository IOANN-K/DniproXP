import { Injectable } from '@nestjs/common';
import { Transactions } from '../database/database.module.js';
import type { EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import {
  QuestPolicy,
  conflict,
  openLifecycles,
} from '../quests/quest.policy.js';
import {
  ApplicationStatus,
  ParticipationStatus,
  ReportStatus,
  QuestModeration,
  LedgerType,
} from '../quests/domain.js';
import {
  QuestApplication,
  Participation,
  ParticipationReport,
} from './participation.entity.js';
import { VerifiedActivity, RewardLedger } from '../ledger/ledger.entity.js';
import { LedgerService, ledgerView } from '../ledger/ledger.service.js';
import { reportView, activityView } from './participation.mapper.js';
import type { VerificationDto, ReportDto } from './participation.dto.js';
import {
  participationTransition,
  reportTransition,
} from './participation.policy.js';
@Injectable()
export class VerificationService {
  constructor(
    private readonly transactions: Transactions,
    private readonly policy: QuestPolicy,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}
  approve(actorId: string, reportId: string): Promise<VerificationDto> {
    return this.transactions.run((manager) =>
      this.approveWithin(manager, actorId, reportId),
    );
  }
  // Shared by explicit dev seed: exactly the same verification/ledger pipeline, with no authorization bypass.
  async approveWithin(
    manager: EntityManager,
    actorId: string,
    reportId: string,
  ): Promise<VerificationDto> {
    const { quest, p, report, app } = await this.context(
      manager,
      actorId,
      reportId,
    );
    const existing = await manager.findOneBy(VerifiedActivity, {
      participationId: p.id,
    });
    if (report.status === ReportStatus.APPROVED) {
      if (
        !existing ||
        existing.reportId !== report.id ||
        p.status !== ParticipationStatus.COMPLETED
      )
        conflict(
          'Неузгоджена історія підтвердження.',
          'VERIFICATION_INCONSISTENT',
        );
      const transactions = await manager.find(RewardLedger, {
        where: {
          userId: p.userId,
          sourceType: 'participation',
          sourceId: p.id,
          transactionType: LedgerType.QUEST_COMPLETION,
        },
        order: { currency: 'ASC' },
      });
      if (transactions.length !== 2)
        conflict('Відсутня історія нагороди.', 'VERIFICATION_INCONSISTENT');
      return {
        report: reportView(report),
        activity: activityView(existing),
        transactions: transactions.map(ledgerView),
      };
    }
    if (
      existing ||
      p.status !== ParticipationStatus.PENDING ||
      app.status !== ApplicationStatus.APPROVED ||
      report.status !== ReportStatus.SUBMITTED ||
      !openLifecycles.includes(quest.lifecycle) ||
      quest.moderation !== QuestModeration.APPROVED ||
      !quest.startAt ||
      quest.startAt.getTime() > Date.now()
    )
      conflict('Звіт недоступний для підтвердження.');
    await this.policy.activeUser(manager, p.userId);
    reportTransition(report.status, ReportStatus.APPROVED);
    participationTransition(p.status, ParticipationStatus.COMPLETED);
    const now = new Date();
    report.status = ReportStatus.APPROVED;
    report.reviewedAt = now;
    report.reviewedByUserId = actorId;
    report.reviewReason = null;
    p.status = ParticipationStatus.COMPLETED;
    p.confirmedAt = now;
    await manager.save(report);
    await manager.save(p);
    const transactions = await this.ledger.awardQuest(manager, quest, p);
    const activity = await manager.save(
      VerifiedActivity,
      manager.create(VerifiedActivity, {
        userId: p.userId,
        questId: quest.id,
        participationId: p.id,
        reportId: report.id,
        organizationId: quest.organizationId,
        categoryId: quest.categoryId,
        district: quest.district,
        verifiedMinutes: report.reportedMinutes,
        xpAwarded: quest.xp,
        rewardPointsAwarded: quest.rewardPoints,
        sourceEventId: `completion:${p.userId}:${quest.id}`,
        verifiedByUserId: actorId,
        verifiedAt: now,
      }),
    );
    await this.audit.record(
      manager,
      actorId,
      'PARTICIPATION_VERIFIED',
      'participation',
      p.id,
      {
        questId: quest.id,
        reportId: report.id,
        verifiedActivityId: activity.id,
        sourceEventId: activity.sourceEventId,
        xp: quest.xp,
        rewardPoints: quest.rewardPoints,
      },
    );
    return {
      report: reportView(report),
      activity: activityView(activity),
      transactions: transactions
        .sort((a, b) => a.currency.localeCompare(b.currency))
        .map(ledgerView),
    };
  }
  reject(
    actorId: string,
    reportId: string,
    reason: string,
  ): Promise<ReportDto> {
    return this.transactions.run(async (manager) => {
      const { quest, p, report } = await this.context(
        manager,
        actorId,
        reportId,
      );
      if (
        report.status === ReportStatus.REJECTED &&
        report.reviewReason === reason
      )
        return reportView(report);
      if (
        report.status !== ReportStatus.SUBMITTED ||
        p.status !== ParticipationStatus.PENDING ||
        !openLifecycles.includes(quest.lifecycle) ||
        quest.moderation !== QuestModeration.APPROVED
      )
        conflict('Звіт недоступний для повернення.');
      reportTransition(report.status, ReportStatus.REJECTED);
      participationTransition(p.status, ParticipationStatus.ACTIVE);
      report.status = ReportStatus.REJECTED;
      report.reviewedAt = new Date();
      report.reviewedByUserId = actorId;
      report.reviewReason = reason;
      p.status = ParticipationStatus.ACTIVE;
      await manager.save(report);
      await manager.save(p);
      await this.audit.record(
        manager,
        actorId,
        'REPORT_REJECTED',
        'participation_report',
        report.id,
        { reason, participationId: p.id },
      );
      return reportView(report);
    });
  }
  private async context(
    manager: EntityManager,
    actorId: string,
    reportId: string,
  ) {
    if (!manager.queryRunner?.isTransactionActive)
      throw new Error('Verification requires an active transaction');
    const ref = await manager.findOneBy(ParticipationReport, { id: reportId });
    const pref = ref
      ? await manager.findOneBy(Participation, { id: ref.participationId })
      : null;
    if (!ref || !pref)
      throw new DomainError(404, 'NOT_FOUND', 'Звіт не знайдено.');
    const { quest } = await this.policy.lock(
      manager,
      pref.questId,
      actorId,
      'verify',
    );
    const app = await manager.findOne(QuestApplication, {
      where: { id: pref.applicationId },
      lock: { mode: 'pessimistic_write' },
    });
    const p = await manager.findOne(Participation, {
      where: { id: pref.id },
      lock: { mode: 'pessimistic_write' },
    });
    const report = await manager.findOne(ParticipationReport, {
      where: { id: reportId },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      !app ||
      !p ||
      !report ||
      report.submittedByUserId !== p.userId ||
      report.participationId !== p.id
    )
      conflict('Неузгоджена участь або звіт.');
    if (actorId === p.userId)
      throw new DomainError(
        403,
        'SELF_REVIEW_FORBIDDEN',
        'Не можна підтверджувати власний внесок.',
      );
    return { quest, app, p, report };
  }
}
