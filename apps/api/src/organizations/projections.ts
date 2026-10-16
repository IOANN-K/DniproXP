import type {
  Organization,
  OrganizationMembership,
} from '../database/entities/organization.entity.js';
import type {
  OrganizationDto,
  ManagedOrganizationDto,
  MembershipDto,
} from './organizations.dto.js';
export function organizationView(org: Organization): OrganizationDto {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    logoUrl: org.logoUrl,
    websiteUrl: org.websiteUrl,
    moderationStatus: org.moderationStatus,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}
export function managedOrganization(org: Organization): ManagedOrganizationDto {
  return { ...organizationView(org), moderationReason: org.moderationReason };
}
export function membershipView(member: OrganizationMembership): MembershipDto {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}
