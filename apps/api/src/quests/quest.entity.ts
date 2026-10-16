import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Organization } from '../database/entities/organization.entity.js';
import {
  QuestCategory,
  QuestDifficulty,
  QuestLifecycle,
  QuestModeration,
} from './domain.js';
@Entity('quests')
@Unique('quests_seed_key_key', ['seedKey'])
@Index('quests_public_date', { synchronize: false })
@Index('quests_org_lifecycle', ['organizationId', 'lifecycle'])
export class Quest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'organization_id' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Relation<Organization>;
  @Column({ type: 'varchar', length: 100 }) title: string;
  @Column({ type: 'varchar', length: 240, default: '' }) description: string;
  @Column({ type: 'text', name: 'full_description', default: '' })
  fullDescription: string;
  @Column({ type: 'varchar', name: 'category_id' }) categoryId: QuestCategory;
  @Column({ type: 'varchar' }) difficulty: QuestDifficulty;
  @Column({ type: 'varchar', length: 80, default: '' }) district: string;
  @Column({ type: 'varchar', length: 200, default: '' }) address: string;
  @Column({ type: 'double precision', nullable: true }) latitude: number | null;
  @Column({ type: 'double precision', nullable: true }) longitude:
    number | null;
  @Column({ type: 'text', name: 'coordinate_source', nullable: true })
  coordinateSource: string | null;
  @Column({ type: 'text', name: 'location_label', nullable: true })
  locationLabel: string | null;
  @Column({ type: 'timestamptz', name: 'start_at', nullable: true })
  startAt: Date | null;
  @Column({ type: 'timestamptz', name: 'end_at', nullable: true })
  endAt: Date | null;
  @Column({ type: 'integer' }) capacity: number;
  @Column({ type: 'integer' }) xp: number;
  @Column({ type: 'integer', name: 'reward_points' }) rewardPoints: number;
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  requirements: string[];
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  bring: string[];
  @Column({ type: 'text', default: '' }) instructions: string;
  @Column({ type: 'text', nullable: true }) image: string | null;
  @Column({ type: 'text', name: 'image_alt', default: '' }) imageAlt: string;
  @Column({ type: 'varchar', default: QuestLifecycle.DRAFT })
  lifecycle: QuestLifecycle;
  @Column({ type: 'varchar', name: 'archived_from', nullable: true })
  archivedFrom: QuestLifecycle | null;
  @Column({ type: 'varchar', default: QuestModeration.PENDING })
  moderation: QuestModeration;
  @Column({ type: 'text', name: 'moderation_reason', nullable: true })
  moderationReason: string | null;
  @Column({ type: 'timestamptz', name: 'review_submitted_at', nullable: true })
  reviewSubmittedAt: Date | null;
  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt: Date | null;
  @Column({ type: 'boolean', name: 'allow_team_participation', default: false })
  allowTeamParticipation: boolean;
  @Column({ type: 'integer', name: 'team_participant_limit', nullable: true })
  teamParticipantLimit: number | null;
  @Column({ type: 'text', name: 'seed_key', nullable: true, select: false })
  seedKey: string | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
