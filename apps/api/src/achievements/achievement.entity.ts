import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
export type AchievementRule = { kind: 'QUEST_COUNT' | 'TEAM_PARTICIPATIONS' | 'TEAM_HOURS' | 'TEAM_CATEGORY_QUESTS'; target: number; category?: string };
@Entity('achievement_definitions')
export class AchievementDefinition {
  @PrimaryColumn({ type: 'uuid' }) id: string;
  @Column({ type: 'varchar' }) slug: string;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar' }) icon: string;
  @Column({ type: 'varchar' }) tier: string;
  @Column({ type: 'varchar' }) scope: 'USER' | 'TEAM';
  @Column({ type: 'varchar' }) status: 'ACTIVE' | 'ARCHIVED';
  @Column({ type: 'jsonb' }) requirements: AchievementRule;
}
@Entity('user_achievement_unlocks')
export class AchievementUnlock {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id', nullable: true }) userId: string | null;
  @Column({ type: 'uuid', name: 'team_id', nullable: true }) teamId: string | null;
  @Column({ type: 'uuid', name: 'achievement_id', nullable: true }) achievementId: string | null;
  @Column({ type: 'uuid', name: 'progress_claim_id', nullable: true }) progressClaimId: string | null;
  @Column({ type: 'jsonb' }) badge: { id: string; title: string; description: string; icon?: string };
  @Column({ type: 'jsonb', name: 'evidence_ids' }) evidenceIds: string[];
  @Column({ type: 'timestamptz', name: 'unlocked_at' }) unlockedAt: Date;
  @CreateDateColumn({ type: 'timestamptz', name: 'recorded_at' }) recordedAt: Date;
}
