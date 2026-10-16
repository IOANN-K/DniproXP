import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import {
  Organization,
  OrganizationMembership,
} from '../database/entities/organization.entity.js';
import {
  ModerationStatus,
  MembershipStatus,
  Role,
  StaffRole,
} from '../database/entities/domain.js';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { DomainError } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { Quest } from './quest.entity.js';
import { occupiedSql, occupied, conflict } from './quest.policy.js';
import { managedQuest, questView } from './quest.mapper.js';
import type {
  QuestQueryDto,
  QuestDto,
  ManagedQuestDto,
  QuestPageDto,
  ManagedQuestPageDto,
} from './quests.dto.js';
import { QuestLifecycle, QuestModeration } from './domain.js';
@Injectable()
export class QuestQueries {
  constructor(
    private readonly source: DataSource,
    private readonly access: OrganizationAccess,
  ) {}
  private filters(
    query: SelectQueryBuilder<Quest>,
    input: QuestQueryDto,
  ): void {
    if (
      (input.from && !Number.isFinite(Date.parse(input.from))) ||
      (input.to && !Number.isFinite(Date.parse(input.to)))
    )
      throw new DomainError(422, 'VALIDATION_FAILED', 'Некоректні межі дат.');
    if (
      input.from &&
      input.to &&
      Date.parse(input.from) >= Date.parse(input.to)
    )
      conflict(
        'Початок діапазону має передувати завершенню.',
        'INVALID_DATE_RANGE',
      );
    if (input.category)
      query.andWhere('q.categoryId=:category', { category: input.category });
    if (input.district)
      query.andWhere('q.district=:district', { district: input.district });
    if (input.difficulty)
      query.andWhere('q.difficulty=:difficulty', {
        difficulty: input.difficulty,
      });
    if (input.lifecycle)
      query.andWhere('q.lifecycle=:lifecycle', { lifecycle: input.lifecycle });
    if (input.status)
      query.andWhere(
        input.status === 'completed'
          ? "(q.lifecycle='completed' OR q.archivedFrom='completed')"
          : "(q.lifecycle<>'completed' AND q.archivedFrom IS DISTINCT FROM 'completed')",
      );
    if (input.organization)
      query.andWhere('q.organizationId=:organization', {
        organization: input.organization,
      });
    if (input.from)
      query.andWhere('q.startAt>=:from', { from: new Date(input.from) });
    if (input.to) query.andWhere('q.startAt<:to', { to: new Date(input.to) });
    if (input.minXp !== undefined)
      query.andWhere('q.xp>=:xp', { xp: input.minXp });
    if (input.search)
      query.andWhere('(q.title ILIKE :search OR q.description ILIKE :search)', {
        search: `%${input.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    if (input.availability !== undefined) {
      const available = `(q.lifecycle IN ('published','active') AND q.moderation='approved' AND org.moderation_status='approved' AND q.end_at>now() AND ${occupiedSql}<q.capacity)`;
      query.andWhere(
        input.availability ? available : `NOT COALESCE(${available},false)`,
      );
    }
    const sort = {
      date: 'q.startAt',
      createdAt: 'q.createdAt',
      xp: 'q.xp',
      title: 'q.title',
    };
    query
      .orderBy(sort[input.sort], input.order, 'NULLS LAST')
      .addOrderBy('q.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize);
  }
  async list(
    input: QuestQueryDto,
    organizationId?: string,
    actorId?: string,
    pending = false,
  ): Promise<QuestPageDto | ManagedQuestPageDto> {
    if (organizationId) {
      if (!actorId)
        throw new DomainError(401, 'UNAUTHENTICATED', 'Потрібно увійти.');
      await this.access.member(this.source.manager, organizationId, actorId, [
        StaffRole.OWNER,
        StaffRole.MANAGER,
        StaffRole.REVIEWER,
      ]);
    }
    const query = this.source.manager
      .createQueryBuilder(Quest, 'q')
      .innerJoin(Organization, 'org', 'org.id=q.organizationId');
    if (organizationId)
      query.where('q.organizationId=:scope', { scope: organizationId });
    else if (pending)
      query.where(
        "q.lifecycle='draft' AND q.moderation='pending' AND q.reviewSubmittedAt IS NOT NULL",
      );
    else
      query.where(
        "q.publishedAt IS NOT NULL AND q.lifecycle<>'draft' AND q.moderation='approved' AND org.moderation_status='approved'",
      );
    this.filters(query, input);
    const [rows, total] = await query.getManyAndCount();
    const items = await Promise.all(
      rows.map(async (q) => {
        const org = await this.source.manager.findOneByOrFail(Organization, {
          id: q.organizationId,
        });
        const seats = await occupied(this.source.manager, q.id);
        return organizationId || pending
          ? managedQuest(
              q,
              seats,
              org.moderationStatus === ModerationStatus.APPROVED,
            )
          : questView(q, seats, true);
      }),
    );
    // Explicit shapes avoid exposing internal moderation fields through public DTOs.
    return {
      items,
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async get(
    id: string,
    principal?: Principal,
  ): Promise<QuestDto | ManagedQuestDto> {
    const q = await this.source.manager.findOneBy(Quest, { id });
    const org = q
      ? await this.source.manager.findOneBy(Organization, {
          id: q.organizationId,
        })
      : null;
    if (!q || !org)
      throw new DomainError(404, 'NOT_FOUND', 'Квест не знайдено.');
    const member = principal
      ? await this.source.manager.findOneBy(OrganizationMembership, {
          organizationId: q.organizationId,
          userId: principal.user.id,
          status: MembershipStatus.ACTIVE,
        })
      : null;
    const internal = !!member || !!principal?.user.roles.includes(Role.ADMIN);
    if (
      !internal &&
      (!q.publishedAt ||
        q.lifecycle === QuestLifecycle.DRAFT ||
        q.moderation !== QuestModeration.APPROVED ||
        org.moderationStatus !== ModerationStatus.APPROVED)
    )
      throw new DomainError(404, 'NOT_FOUND', 'Квест не знайдено.');
    const seats = await occupied(this.source.manager, q.id);
    return internal
      ? managedQuest(
          q,
          seats,
          org.moderationStatus === ModerationStatus.APPROVED,
        )
      : questView(q, seats, true);
  }
}
