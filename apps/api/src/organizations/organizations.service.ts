import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager, SelectQueryBuilder } from 'typeorm';
import {
  Organization,
  OrganizationMembership,
} from '../database/entities/organization.entity.js';
import { User } from '../database/entities/user.entity.js';
import {
  Role,
  MembershipStatus,
  ModerationStatus,
  StaffRole,
  UserStatus,
} from '../database/entities/domain.js';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import { OrganizationAccess } from './organization-access.service.js';
import {
  managedOrganization,
  membershipView,
  organizationView,
} from './projections.js';
import type {
  AddMemberDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateMemberDto,
  PaginationDto,
  MembershipQueryDto,
  MembershipDto,
  MembershipsPageDto,
  OrganizationDto,
  ManagedOrganizationDto,
  OrganizationsPageDto,
  ManagedOrganizationsPageDto,
} from './organizations.dto.js';
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly source: DataSource,
    private readonly transactions: Transactions,
    private readonly audit: AuditService,
    private readonly access: OrganizationAccess,
  ) {}
  private pageQuery(
    query: SelectQueryBuilder<Organization>,
    input: PaginationDto,
  ): void {
    if (input.search)
      query.andWhere('org.name ILIKE :search', {
        search: `%${input.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    query
      .orderBy(
        input.sort === 'name' ? 'org.name' : 'org.createdAt',
        input.order,
      )
      .addOrderBy('org.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize);
  }
  async list(input: PaginationDto): Promise<OrganizationsPageDto> {
    const query = this.source.manager
      .createQueryBuilder(Organization, 'org')
      .where('org.moderationStatus = :status', {
        status: ModerationStatus.APPROVED,
      });
    this.pageQuery(query, input);
    const [rows, total] = await query.getManyAndCount();
    return {
      items: rows.map(organizationView),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async mine(
    userId: string,
    input: PaginationDto,
  ): Promise<ManagedOrganizationsPageDto> {
    const query = this.source.manager
      .createQueryBuilder(Organization, 'org')
      .innerJoin(
        OrganizationMembership,
        'member',
        'member.organizationId = org.id AND member.userId = :userId AND member.status = :status',
        { userId, status: MembershipStatus.ACTIVE },
      );
    this.pageQuery(query, input);
    const [rows, total] = await query.getManyAndCount();
    return {
      items: rows.map(managedOrganization),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async pending(input: PaginationDto): Promise<ManagedOrganizationsPageDto> {
    const query = this.source.manager
      .createQueryBuilder(Organization, 'org')
      .where('org.moderationStatus = :status', {
        status: ModerationStatus.PENDING,
      });
    this.pageQuery(query, input);
    const [rows, total] = await query.getManyAndCount();
    return {
      items: rows.map(managedOrganization),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  async get(id: string): Promise<OrganizationDto> {
    const org = await this.source.manager.findOneBy(Organization, {
      id,
      moderationStatus: ModerationStatus.APPROVED,
    });
    if (!org)
      throw new DomainError(404, 'NOT_FOUND', 'Організацію не знайдено.');
    return organizationView(org);
  }
  private async grantOrganizer(
    manager: EntityManager,
    actorId: string,
    userId: string,
  ): Promise<void> {
    const user = await manager.findOne(User, {
      where: { id: userId, status: UserStatus.ACTIVE },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user)
      throw new DomainError(
        404,
        'NOT_FOUND',
        'Активного користувача не знайдено.',
      );
    if (!user.roles.includes(Role.ORGANIZER)) {
      user.roles = [...user.roles, Role.ORGANIZER];
      await manager.save(user);
      await this.audit.record(
        manager,
        actorId,
        'ROLE_GRANTED',
        'user',
        userId,
        { role: Role.ORGANIZER },
      );
    }
  }
  async create(
    actorId: string,
    input: CreateOrganizationDto,
  ): Promise<ManagedOrganizationDto> {
    return this.transactions.run(async (manager) => {
      await this.grantOrganizer(manager, actorId, actorId);
      const org = await manager.save(
        Organization,
        manager.create(Organization, {
          name: input.name,
          slug: input.slug,
          description: input.description,
          logoUrl: input.logoUrl ?? null,
          websiteUrl: input.websiteUrl ?? null,
          moderationStatus: ModerationStatus.PENDING,
          moderationReason: null,
        }),
      );
      const member = await manager.save(
        OrganizationMembership,
        manager.create(OrganizationMembership, {
          organizationId: org.id,
          userId: actorId,
          role: StaffRole.OWNER,
          status: MembershipStatus.ACTIVE,
        }),
      );
      await this.audit.record(
        manager,
        actorId,
        'ORGANIZATION_CREATED',
        'organization',
        org.id,
      );
      await this.audit.record(
        manager,
        actorId,
        'ORGANIZATION_MEMBER_ADDED',
        'organization_membership',
        member.id,
        { organizationId: org.id, userId: actorId, role: member.role },
      );
      return managedOrganization(org);
    });
  }
  async update(
    actorId: string,
    id: string,
    input: UpdateOrganizationDto,
  ): Promise<ManagedOrganizationDto> {
    return this.transactions.run(async (manager) => {
      const org = await this.access.requireCapability(
        manager,
        id,
        actorId,
        'manage',
      );
      if (org.moderationStatus === ModerationStatus.SUSPENDED)
        throw new DomainError(
          409,
          'ORGANIZATION_SUSPENDED',
          'Зміни призупинено до перегляду модератором.',
        );
      if (input.name !== undefined) org.name = input.name;
      if (input.slug !== undefined) org.slug = input.slug;
      if (input.description !== undefined) org.description = input.description;
      if (input.logoUrl !== undefined) org.logoUrl = input.logoUrl;
      if (input.websiteUrl !== undefined) org.websiteUrl = input.websiteUrl;
      const previousStatus = org.moderationStatus;
      org.moderationStatus = ModerationStatus.PENDING;
      org.moderationReason = null;
      await manager.save(org);
      await this.audit.record(
        manager,
        actorId,
        'ORGANIZATION_UPDATED',
        'organization',
        id,
        { previousStatus, moderationStatus: org.moderationStatus },
      );
      return managedOrganization(org);
    });
  }
  async members(
    actorId: string,
    id: string,
    input: MembershipQueryDto,
  ): Promise<MembershipsPageDto> {
    await this.access.member(this.source.manager, id, actorId, [
      StaffRole.OWNER,
      StaffRole.MANAGER,
      StaffRole.REVIEWER,
    ]);
    const query = this.source.manager
      .createQueryBuilder(OrganizationMembership, 'member')
      .where('member.organizationId = :id', { id });
    if (input.status)
      query.andWhere('member.status = :status', { status: input.status });
    const [rows, total] = await query
      .orderBy('member.createdAt', input.order)
      .addOrderBy('member.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(membershipView),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
  private async lockStaffScope(
    manager: EntityManager,
    actorId: string,
    id: string,
  ): Promise<void> {
    const org = await manager.findOne(Organization, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!org)
      throw new DomainError(404, 'NOT_FOUND', 'Організацію не знайдено.');
    await this.access.member(manager, id, actorId, [StaffRole.OWNER]);
    if (org.moderationStatus === ModerationStatus.SUSPENDED)
      throw new DomainError(
        409,
        'ORGANIZATION_SUSPENDED',
        'Керування складом призупинено.',
      );
  }
  async addMember(
    actorId: string,
    id: string,
    input: AddMemberDto,
  ): Promise<MembershipDto> {
    return this.transactions.run(async (manager) => {
      await this.lockStaffScope(manager, actorId, id);
      const old = await manager.findOneBy(OrganizationMembership, {
        organizationId: id,
        userId: input.userId,
      });
      if (old?.status === MembershipStatus.ACTIVE)
        throw new DomainError(
          409,
          'MEMBER_EXISTS',
          'Користувач уже входить до організації.',
        );
      await this.grantOrganizer(manager, actorId, input.userId);
      const member =
        old ??
        manager.create(OrganizationMembership, {
          organizationId: id,
          userId: input.userId,
        });
      member.role = input.role;
      member.status = MembershipStatus.ACTIVE;
      await manager.save(member);
      await this.audit.record(
        manager,
        actorId,
        'ORGANIZATION_MEMBER_ADDED',
        'organization_membership',
        member.id,
        { organizationId: id, userId: input.userId, role: member.role },
      );
      return membershipView(member);
    });
  }
  async updateMember(
    actorId: string,
    id: string,
    userId: string,
    input: UpdateMemberDto,
  ): Promise<MembershipDto> {
    return this.transactions.run(async (manager) => {
      await this.lockStaffScope(manager, actorId, id);
      const member = await manager.findOneBy(OrganizationMembership, {
        organizationId: id,
        userId,
      });
      if (!member)
        throw new DomainError(404, 'NOT_FOUND', 'Учасника не знайдено.');
      const nextRole = input.role ?? member.role;
      const nextStatus = input.status ?? member.status;
      if (
        member.status === MembershipStatus.ACTIVE &&
        member.role === StaffRole.OWNER &&
        (nextRole !== StaffRole.OWNER || nextStatus !== MembershipStatus.ACTIVE)
      ) {
        const owners = await manager.countBy(OrganizationMembership, {
          organizationId: id,
          role: StaffRole.OWNER,
          status: MembershipStatus.ACTIVE,
        });
        if (owners <= 1)
          throw new DomainError(
            409,
            'LAST_OWNER',
            'Спочатку признач іншого власника.',
          );
      }
      if (nextStatus === MembershipStatus.ACTIVE)
        await this.grantOrganizer(manager, actorId, userId);
      const previousRole = member.role;
      const previousStatus = member.status;
      member.role = nextRole;
      member.status = nextStatus;
      await manager.save(member);
      await this.audit.record(
        manager,
        actorId,
        'ORGANIZATION_MEMBER_UPDATED',
        'organization_membership',
        member.id,
        {
          organizationId: id,
          userId,
          previousRole,
          role: member.role,
          previousStatus,
          status: member.status,
        },
      );
      return membershipView(member);
    });
  }
  async removeMember(
    actorId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.updateMember(actorId, id, userId, {
      status: MembershipStatus.REMOVED,
    });
  }
  async moderate(
    actorId: string,
    id: string,
    status: ModerationStatus,
    reason: string | null,
  ): Promise<ManagedOrganizationDto> {
    return this.transactions.run(async (manager) => {
      const actor = await manager.findOneBy(User, {
        id: actorId,
        status: UserStatus.ACTIVE,
      });
      if (!actor?.roles.includes(Role.ADMIN))
        throw new DomainError(
          403,
          'FORBIDDEN',
          'Потрібні права адміністратора.',
        );
      const org = await manager.findOne(Organization, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!org)
        throw new DomainError(404, 'NOT_FOUND', 'Організацію не знайдено.');
      // Admins moderate explicitly; no bypass of membership checks in ordinary organization routes.
      const selfMember = await manager.findOneBy(OrganizationMembership, {
        organizationId: id,
        userId: actorId,
        status: MembershipStatus.ACTIVE,
      });
      if (selfMember)
        throw new DomainError(
          403,
          'SELF_MODERATION_FORBIDDEN',
          'Модерація власної організації заборонена.',
        );
      if (org.moderationStatus === status) return managedOrganization(org);
      const allowed =
        status === ModerationStatus.SUSPENDED
          ? org.moderationStatus === ModerationStatus.APPROVED
          : status === ModerationStatus.APPROVED
            ? [ModerationStatus.PENDING, ModerationStatus.SUSPENDED].includes(
                org.moderationStatus,
              )
            : status === ModerationStatus.REJECTED &&
              org.moderationStatus === ModerationStatus.PENDING;
      if (!allowed)
        throw new DomainError(
          409,
          'INVALID_MODERATION_TRANSITION',
          'Недопустимий перехід статусу модерації.',
        );
      const previousStatus = org.moderationStatus;
      org.moderationStatus = status;
      org.moderationReason = reason;
      await manager.save(org);
      await this.audit.record(
        manager,
        actorId,
        'ORGANIZATION_MODERATED',
        'organization',
        id,
        { previousStatus, moderationStatus: status, reason },
      );
      return managedOrganization(org);
    });
  }
}
