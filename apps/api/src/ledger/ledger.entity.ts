import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { Quest } from '../quests/quest.entity.js';
import {
  Participation,
  ParticipationReport,
} from '../participations/participation.entity.js';
import { Currency, LedgerType, QuestCategory } from '../quests/domain.js';
@Entity('reward_ledger')
@Unique('ledger_idempotency_key_key', ['idempotencyKey'])
@Unique('ledger_source_currency', [
  'userId',
  'currency',
  'transactionType',
  'sourceType',
  'sourceId',
])
@Index('ledger_user_date', { synchronize: false })
export class RewardLedger {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  @Column({ type: 'varchar' }) currency: Currency;
  @Column({ type: 'integer' }) amount: number;
  @Column({ type: 'varchar', name: 'transaction_type' })
  transactionType: LedgerType;
  @Column({ type: 'varchar', name: 'source_type' }) sourceType: string;
  @Column({ type: 'uuid', name: 'source_id' }) sourceId: string;
  @Column({ type: 'varchar', length: 200, name: 'idempotency_key' })
  idempotencyKey: string;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) metadata: Record<
    string,
    string | number | boolean | null
  >;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
@Entity('verified_activities')
@Unique('verified_participation_unique', ['participationId'])
@Unique('verified_report_unique', ['reportId'])
@Unique('verified_user_quest_unique', ['userId', 'questId'])
@Unique('verified_source_event_unique', ['sourceEventId'])
@Index('verified_user_date', { synchronize: false })
export class VerifiedActivity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  @Column({ type: 'uuid', name: 'quest_id' }) questId: string;
  @ManyToOne(() => Quest, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'quest_id' })
  quest: Relation<Quest>;
  @Column({ type: 'uuid', name: 'participation_id' }) participationId: string;
  @ManyToOne(() => Participation, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'participation_id' })
  participation: Relation<Participation>;
  @Column({ type: 'uuid', name: 'report_id' }) reportId: string;
  @ManyToOne(() => ParticipationReport, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'report_id' })
  report: Relation<ParticipationReport>;
  @Column({ type: 'uuid', name: 'organization_id' }) organizationId: string;
  @Column({ type: 'varchar', name: 'category_id' })
  categoryId: QuestCategory;
  @Column({ type: 'varchar', length: 80 }) district: string;
  @Column({ type: 'integer', name: 'verified_minutes', nullable: true })
  verifiedMinutes: number | null;
  @Column({ type: 'integer', name: 'xp_awarded' }) xpAwarded: number;
  @Column({ type: 'integer', name: 'reward_points_awarded' })
  rewardPointsAwarded: number;
  @Column({ type: 'varchar', length: 200, name: 'source_event_id' })
  sourceEventId: string;
  @Column({ type: 'uuid', name: 'verified_by_user_id' })
  verifiedByUserId: string;
  @CreateDateColumn({ type: 'timestamptz', name: 'verified_at' })
  verifiedAt: Date;
}
