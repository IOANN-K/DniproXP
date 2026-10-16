import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  Index,
  Unique,
  Check,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { MembershipStatus, ModerationStatus, StaffRole } from './domain.js';
@Unique('organizations_slug_key', ['slug'])
@Unique('organizations_seed_key_key', ['seedKey'])
@Index('organizations_status_created', { synchronize: false })
@Check('organizations_slug_valid', "slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'")
@Check('organizations_name_valid', 'length(btrim(name)) BETWEEN 2 AND 120')
@Check(
  'organizations_moderation_status_check',
  "moderation_status IN ('pending','approved','rejected','suspended')",
)
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'varchar', length: 80 }) slug: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'text', nullable: true, name: 'logo_url' }) logoUrl:
    string | null;
  @Column({ type: 'text', nullable: true, name: 'website_url' }) websiteUrl:
    string | null;
  @Column({
    type: 'varchar',
    name: 'moderation_status',
    default: ModerationStatus.PENDING,
  })
  moderationStatus: ModerationStatus;
  @Column({ type: 'text', nullable: true, name: 'moderation_reason' })
  moderationReason: string | null;
  @Column({ type: 'text', nullable: true, name: 'seed_key', select: false })
  seedKey: string | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
@Unique('organization_memberships_organization_id_user_id_key', [
  'organizationId',
  'userId',
])
@Index('memberships_user_status', ['userId', 'status'])
@Index('memberships_organization_status', ['organizationId', 'status'])
@Check(
  'organization_memberships_role_check',
  "role IN ('OWNER','MANAGER','REVIEWER')",
)
@Check(
  'organization_memberships_status_check',
  "status IN ('ACTIVE','REMOVED')",
)
@Entity('organization_memberships')
export class OrganizationMembership {
  @ManyToOne(() => Organization, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'organization_memberships_organization_id_fkey',
  })
  organization: Relation<Organization>;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'organization_memberships_user_id_fkey',
  })
  user: Relation<User>;
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'organization_id' }) organizationId: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'varchar' }) role: StaffRole;
  @Column({ type: 'varchar', default: MembershipStatus.ACTIVE })
  status: MembershipStatus;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
