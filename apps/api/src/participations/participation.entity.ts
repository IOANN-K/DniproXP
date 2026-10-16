import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { Quest } from '../quests/quest.entity.js';
import {
  ApplicationStatus,
  ParticipationStatus,
  ReportStatus,
} from '../quests/domain.js';
@Entity('quest_applications')
@Unique('applications_user_quest', ['userId', 'questId'])
@Index('applications_quest_status', ['questId', 'status'])
@Index('applications_user_date', { synchronize: false })
export class QuestApplication {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_application_id', nullable: true }) teamApplicationId: string | null;
  @Column({ type: 'uuid', name: 'quest_id' }) questId: string;
  @ManyToOne(() => Quest, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'quest_id' })
  quest: Relation<Quest>;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  @Column({ type: 'varchar', default: ApplicationStatus.PENDING })
  status: ApplicationStatus;
  @Column({ type: 'text', nullable: true }) reason: string | null;
  @Column({ type: 'uuid', name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId: string | null;
  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;
  @Column({ type: 'timestamptz', name: 'submitted_at' }) submittedAt: Date;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
@Entity('participations')
@Unique('participations_user_quest', ['userId', 'questId'])
@Unique('participations_application_id_key', ['applicationId'])
@Index('participations_user_date', { synchronize: false })
export class Participation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'team_application_id', nullable: true }) teamApplicationId: string | null;
  @Column({ type: 'uuid', name: 'application_id' }) applicationId: string;
  @ManyToOne(() => QuestApplication, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'application_id' })
  application: Relation<QuestApplication>;
  @Column({ type: 'uuid', name: 'quest_id' }) questId: string;
  @ManyToOne(() => Quest, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'quest_id' })
  quest: Relation<Quest>;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  @Column({ type: 'varchar', default: ParticipationStatus.PLANNED })
  status: ParticipationStatus;
  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
@Entity('participation_reports')
@Index('reports_one_submitted', { synchronize: false })
@Index('reports_one_approved', { synchronize: false })
export class ParticipationReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'participation_id' }) participationId: string;
  @ManyToOne(() => Participation, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'participation_id' })
  participation: Relation<Participation>;
  @Column({ type: 'uuid', name: 'submitted_by_user_id' })
  submittedByUserId: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'integer', name: 'reported_minutes', nullable: true })
  reportedMinutes: number | null;
  @Column({
    type: 'text',
    array: true,
    name: 'evidence_references',
    default: () => "'{}'::text[]",
  })
  evidenceReferences: string[];
  @Column({ type: 'varchar', default: ReportStatus.SUBMITTED })
  status: ReportStatus;
  @CreateDateColumn({ type: 'timestamptz', name: 'submitted_at' })
  submittedAt: Date;
  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;
  @Column({ type: 'uuid', name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId: string | null;
  @Column({ type: 'text', name: 'review_reason', nullable: true })
  reviewReason: string | null;
}
