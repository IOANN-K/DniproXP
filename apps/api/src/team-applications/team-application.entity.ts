import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('team_quest_applications')
export class TeamQuestApplication {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'quest_id' }) questId: string;
  @Column({ type: 'uuid', name: 'submitted_by_user_id' }) submittedByUserId: string;
  @Column({ type: 'uuid', name: 'operation_id' }) operationId: string;
  @Column({ type: 'varchar' }) status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  @Column({ type: 'integer', name: 'participant_count' }) participantCount: number;
  @CreateDateColumn({ type: 'timestamptz', name: 'submitted_at' }) submittedAt: Date;
  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true }) reviewedAt: Date | null;
  @Column({ type: 'uuid', name: 'reviewed_by_user_id', nullable: true }) reviewedByUserId: string | null;
  @Column({ type: 'text', name: 'review_reason', nullable: true }) reviewReason: string | null;
}
@Entity('team_quest_application_members')
export class TeamQuestApplicationMember {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_application_id' }) teamApplicationId: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'quest_id' }) questId: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'uuid', name: 'membership_id' }) membershipId: string;
  @Column({ type: 'uuid', name: 'application_id' }) applicationId: string;
}
@Entity('team_activity_attributions')
export class TeamActivityAttribution {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_id' }) teamId: string;
  @Column({ type: 'uuid', name: 'team_application_id' }) teamApplicationId: string;
  @Column({ type: 'uuid', name: 'membership_id' }) membershipId: string;
  @Column({ type: 'uuid', name: 'verified_activity_id' }) verifiedActivityId: string;
  @Column({ type: 'uuid', name: 'participation_id' }) participationId: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'uuid', name: 'quest_id' }) questId: string;
  @CreateDateColumn({ type: 'timestamptz', name: 'recorded_at' }) recordedAt: Date;
}
