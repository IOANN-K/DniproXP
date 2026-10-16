import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import {
  Organization,
  OrganizationMembership,
} from '../database/entities/organization.entity.js';
import { User } from '../database/entities/user.entity.js';
import {
  MembershipStatus,
  ModerationStatus,
  StaffRole,
  UserStatus,
} from '../database/entities/domain.js';
import { DomainError } from '../common/http.js';
export type OrganizationCapability = 'manage' | 'publish' | 'verify';
@Injectable()
export class OrganizationAccess {
  async member(
    manager: EntityManager,
    organizationId: string,
    userId: string,
    roles: StaffRole[],
  ): Promise<OrganizationMembership> {
    const member = await manager.findOneBy(OrganizationMembership, {
      organizationId,
      userId,
      status: MembershipStatus.ACTIVE,
    });
    if (!member || !roles.includes(member.role))
      throw new DomainError(
        403,
        'ORGANIZATION_SCOPE_REQUIRED',
        'Недостатньо прав у цій організації.',
      );
    return member;
  }
  // BE-02 must call inside the SAME transaction as publication/verification. Locks serialize moderation/staff removal.
  async requireCapability(
    manager: EntityManager,
    organizationId: string,
    userId: string,
    capability: OrganizationCapability,
  ): Promise<Organization> {
    const org = await manager.findOne(Organization, {
      where: { id: organizationId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!org)
      throw new DomainError(404, 'NOT_FOUND', 'Організацію не знайдено.');
    const user = await manager.findOneBy(User, {
      id: userId,
      status: UserStatus.ACTIVE,
    });
    if (!user)
      throw new DomainError(403, 'FORBIDDEN', 'Обліковий запис недоступний.');
    await this.member(
      manager,
      organizationId,
      userId,
      capability === 'verify'
        ? [StaffRole.OWNER, StaffRole.MANAGER, StaffRole.REVIEWER]
        : [StaffRole.OWNER, StaffRole.MANAGER],
    );
    if (
      capability !== 'manage' &&
      org.moderationStatus !== ModerationStatus.APPROVED
    )
      throw new DomainError(
        409,
        'ORGANIZATION_NOT_APPROVED',
        'Організація має пройти модерацію.',
      );
    return org;
  }
}
