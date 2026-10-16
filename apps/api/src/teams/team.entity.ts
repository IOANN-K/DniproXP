import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
export type TeamRole = 'OWNER' | 'MANAGER' | 'MEMBER';
export type MembershipStatus = 'ACTIVE' | 'LEFT' | 'REMOVED';
export type JoinPolicy = 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 100 }) slug: string;
  @Column({ type: 'varchar', length: 70 }) name: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar' }) avatar: string;
  @Column({ type: 'varchar', name: 'cover_image' }) coverImage: string;
  @Column({ type: 'varchar' }) category: string;
  @Column({ type: 'varchar', default: 'Дніпро' }) city: string;
  @Column({ type: 'uuid', name: 'captain_user_id' }) captainUserId: string;
  @Column({ type: 'varchar' }) visibility: 'PUBLIC' | 'PRIVATE';
  @Column({ type: 'varchar', name: 'join_policy' }) joinPolicy: JoinPolicy;
  @Column({ type: 'integer', name: 'member_limit' }) memberLimit: number;
  @Column({ type: 'varchar', default: 'ACTIVE' }) status: 'ACTIVE' | 'ARCHIVED';
  @Column({ type: 'text', name: 'seed_key', nullable: true, select: false }) seedKey: string | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' }) updatedAt: Date;
}
@Entity('team_memberships')
export class TeamMembership {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'varchar' }) role: TeamRole;
  @Column({ type: 'varchar' }) status: MembershipStatus;
  @CreateDateColumn({ type: 'timestamptz', name: 'joined_at' }) joinedAt: Date;
  @Column({ type: 'timestamptz', name: 'left_at', nullable: true }) leftAt: Date | null;
  @Column({ type: 'uuid', name: 'invited_by', nullable: true }) invitedBy: string | null;
  @Column({ type: 'uuid', name: 'approved_by', nullable: true }) approvedBy: string | null;
}
@Entity('team_invitations')
export class TeamInvitation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'invited_user_id' }) invitedUserId: string;
  @Column({ type: 'uuid', name: 'invited_by' }) invitedBy: string;
  @Column({ type: 'varchar' }) status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt: Date;
  @Column({ type: 'timestamptz', name: 'expires_at' }) expiresAt: Date;
  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true }) resolvedAt: Date | null;
}
@Entity('team_join_requests')
export class TeamJoinRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'varchar' }) status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  @Column({ type: 'text', nullable: true }) reason: string | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt: Date;
  @Column({ type: 'uuid', name: 'reviewed_by', nullable: true }) reviewedBy: string | null;
  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true }) reviewedAt: Date | null;
}
