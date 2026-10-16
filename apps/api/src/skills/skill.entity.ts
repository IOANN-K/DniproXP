import { Column, Entity, PrimaryColumn, ViewColumn, ViewEntity } from 'typeorm';
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export type SkillCategory = 'eco' | 'social' | 'events' | 'education' | 'communication' | 'leadership' | 'logistics' | 'digital';
export type SkillRules = { baseXp: number; xpPerHour: number; requiresTeam: boolean };
export type SkillPrerequisite = { skillId: string; minLevel: number };
@Entity('skill_definitions')
export class SkillDefinition {
  @PrimaryColumn({ type: 'uuid' }) id: string;
  @Column({ type: 'varchar' }) slug: string;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar' }) category: SkillCategory;
  @Column({ type: 'varchar' }) icon: string;
  @Column({ type: 'varchar' }) status: 'ACTIVE' | 'ARCHIVED';
  @Column({ type: 'integer', array: true, name: 'level_thresholds' }) levelThresholds: number[];
  @Column({ type: 'text', array: true, name: 'eligible_quest_categories' }) eligibleQuestCategories: string[];
  @Column({ type: 'jsonb' }) prerequisites: SkillPrerequisite[];
  @Column({ type: 'jsonb', name: 'experience_rules' }) experienceRules: SkillRules;
}
@ViewEntity({ name: 'user_skill_evidence', synchronize: false })
export class UserSkillEvidence {
  @ViewColumn() id: string;
  @ViewColumn({ name: 'user_id' }) userId: string;
  @ViewColumn({ name: 'skill_id' }) skillId: string;
  @ViewColumn({ name: 'source_activity_id' }) sourceActivityId: string;
  @ViewColumn({ name: 'quest_id' }) questId: string;
  @ViewColumn({ name: 'earned_xp' }) earnedXp: string;
  @ViewColumn({ name: 'verified_minutes' }) verifiedMinutes: number;
  @ViewColumn({ name: 'confirmed_at' }) confirmedAt: Date;
}
