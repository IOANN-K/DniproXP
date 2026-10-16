import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { Organization } from '../database/entities/organization.entity.js';
import { StaffRole } from '../database/entities/domain.js';
import { DomainError } from '../common/http.js';
import { Quest } from '../quests/quest.entity.js';
import { occupied } from '../quests/quest.policy.js';
import { questView } from '../quests/quest.mapper.js';
import {
  QuestApplication,
  Participation,
  ParticipationReport,
} from './participation.entity.js';
import { VerifiedActivity } from '../ledger/ledger.entity.js';
import { ReportStatus, ParticipationStatus } from '../quests/domain.js';
import { applicationView, reportView } from './participation.mapper.js';
import type {
  ApplicationQueryDto,
  ParticipationQueryDto,
  ReportQueryDto,
  ApplicationPageDto,
  ParticipationPageDto,
  ParticipationDto,
  ReportPageDto,
} from './participation.dto.js';
@Injectable()
export class ParticipationQueries {
  constructor(
    private readonly source: DataSource,
    private readonly access: OrganizationAccess,
  ) {}
  async readScope(
    manager: EntityManager,
    userId: string,
    questId: string,
  ): Promise<Quest> {
    const quest = await manager.findOneBy(Quest, { id: questId });
    if (!quest) throw new DomainError(404, 'NOT_FOUND', 'Квест не знайдено.');
    await this.access.member(manager, quest.organizationId, userId, [
      StaffRole.OWNER,
      StaffRole.MANAGER,
      StaffRole.REVIEWER,
    ]);
    return quest;
  }
  async questSnapshot(manager: EntityManager, questId: string) {
    const q = await manager.findOneByOrFail(Quest, { id: questId });
    const org = await manager.findOneByOrFail(Organization, {
      id: q.organizationId,
    });
    return questView(
      q,
      await occupied(manager, q.id),
      org.moderationStatus === 'approved',
    );
  }
  async participationView(
    manager: EntityManager,
    p: Participation,
  ): Promise<ParticipationDto> {
    const application = await manager.findOneByOrFail(QuestApplication, {
      id: p.applicationId,
    });
    const activity = await manager.findOneBy(VerifiedActivity, {
      participationId: p.id,
    });
    return {
      id: p.id,
      applicationId: p.applicationId,
      questId: p.questId,
      userId: p.userId,
      status: p.status,
      confirmedAt: p.confirmedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      quest: await this.questSnapshot(manager, p.questId),
      applicationStatus: application.status,
      awardedXp: activity?.xpAwarded ?? null,
      awardedPoints: activity?.rewardPointsAwarded ?? null,
    };
  }
  async applications(
    userId: string,
    input: ApplicationQueryDto,
    questId?: string,
  ): Promise<ApplicationPageDto> {
    if (questId) await this.readScope(this.source.manager, userId, questId);
    const query = this.source.manager
      .createQueryBuilder(QuestApplication, 'a')
      .where(questId ? 'a.questId=:questId' : 'a.userId=:userId', {
        questId,
        userId,
      });
    if (input.status)
      query.andWhere('a.status=:status', { status: input.status });
    const [rows, total] = await query
      .orderBy('a.createdAt', input.order)
      .addOrderBy('a.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      items: await Promise.all(
        rows.map(async (row) =>
          applicationView(
            row,
            await this.questSnapshot(this.source.manager, row.questId),
          ),
        ),
      ),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async participations(
    userId: string,
    input: ParticipationQueryDto,
    questId?: string,
  ): Promise<ParticipationPageDto> {
    if (questId) await this.readScope(this.source.manager, userId, questId);
    const query = this.source.manager
      .createQueryBuilder(Participation, 'p')
      .where(questId ? 'p.questId=:questId' : 'p.userId=:userId', {
        questId,
        userId,
      });
    if (input.status)
      query.andWhere('p.status=:status', { status: input.status });
    const [rows, total] = await query
      .orderBy('p.createdAt', input.order)
      .addOrderBy('p.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      items: await Promise.all(
        rows.map((row) => this.participationView(this.source.manager, row)),
      ),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async reports(
    userId: string,
    participationId: string,
    input: ReportQueryDto,
  ): Promise<ReportPageDto> {
    const p = await this.source.manager.findOneBy(Participation, {
      id: participationId,
    });
    if (!p) throw new DomainError(404, 'NOT_FOUND', 'Участь не знайдено.');
    if (p.userId !== userId)
      await this.readScope(this.source.manager, userId, p.questId);
    const [rows, total] = await this.source.manager.findAndCount(
      ParticipationReport,
      {
        where: { participationId },
        order: { submittedAt: input.order, id: input.order },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      },
    );
    return {
      items: rows.map(reportView),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async pending(
    userId: string,
    organizationId: string,
    input: ReportQueryDto,
  ): Promise<ReportPageDto> {
    await this.access.member(this.source.manager, organizationId, userId, [
      StaffRole.OWNER,
      StaffRole.MANAGER,
      StaffRole.REVIEWER,
    ]);
    const query = this.source.manager
      .createQueryBuilder(ParticipationReport, 'r')
      .innerJoin(Participation, 'p', 'p.id=r.participationId')
      .innerJoin(Quest, 'q', 'q.id=p.questId')
      .where('q.organizationId=:organizationId', { organizationId })
      .andWhere('r.status=:status AND p.status=:pending', {
        status: ReportStatus.SUBMITTED,
        pending: ParticipationStatus.PENDING,
      });
    const [rows, total] = await query
      .orderBy('r.submittedAt', input.order)
      .addOrderBy('r.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(reportView),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
}
