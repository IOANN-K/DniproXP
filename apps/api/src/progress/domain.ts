import { z } from 'zod';

export const missionStatuses = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export const challengeStatuses = ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'] as const;
export type MissionStatus = (typeof missionStatuses)[number];
export type ChallengeStatus = (typeof challengeStatuses)[number];
export const categories = ['eco', 'social', 'animals', 'culture', 'education', 'city'] as const;
export type CategoryId = (typeof categories)[number];
export const physicalMetrics = ['waste_kg', 'trees_planted', 'animals_helped', 'people_helped', 'area_cleaned', 'humanitarian_units'] as const;
export type PhysicalMetric = (typeof physicalMetrics)[number];
export const physicalUnits: Record<PhysicalMetric, string> = {
  waste_kg: 'kg', trees_planted: 'count', animals_helped: 'count',
  people_helped: 'count', area_cleaned: 'm2', humanitarian_units: 'units',
};
export const goalMetrics = ['VOLUNTEER_HOURS', 'LITTER_KG', 'TREES_PLANTED', 'HUMANITARIAN_UNITS'] as const;
export type GoalMetric = (typeof goalMetrics)[number];
export const goalUnits: Record<GoalMetric, string> = {
  VOLUNTEER_HOURS: 'год', LITTER_KG: 'кг', TREES_PLANTED: 'дерев', HUMANITARIAN_UNITS: 'од.',
};
const uuid = z.uuid();
export const badgeSchema = z.object({
  id: uuid,
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(500),
}).strict();

export const missionRulesSchema = z.object({
  steps: z.array(z.object({
    id: uuid, questId: uuid,
    title: z.string().trim().min(3).max(100),
    description: z.string().max(1000),
    order: z.number().int().min(1).max(1000),
    isOptional: z.boolean(),
    prerequisiteStepIds: z.array(uuid).max(100),
  }).strict()).min(1).max(100),
  prerequisites: z.object({
    chainIds: z.array(uuid).max(100),
    questIds: z.array(uuid).max(100),
    minLevel: z.number().int().min(1).max(8),
  }).strict(),
}).strict();
export type MissionRules = z.infer<typeof missionRulesSchema>;

export const challengeRulesSchema = z.object({
  goals: z.array(z.object({
    id: uuid, metric: z.enum(goalMetrics),
    targetValue: z.number().positive().max(1000000).refine(
      value => Number.isInteger(value * 1e6) || Math.abs(value * 1e6 - Math.round(value * 1e6)) < 1e-6,
      'At most six decimal places',
    ),
    unit: z.string().max(20),
    description: z.string().min(3).max(1000),
    isOptional: z.boolean(),
  }).strict()).min(1).max(4),
  relatedQuestIds: z.array(uuid).min(1).max(500),
  categoryIds: z.array(z.enum(categories)).max(6).default([]),
  districts: z.array(z.string().min(1).max(80)).max(50).default([]),
  organizationIds: z.array(uuid).max(100).default([]),
  milestones: z.array(z.number().int().min(1).max(100)).min(1).max(20).default([25, 50, 75, 100]),
}).strict();
export type ChallengeRules = z.infer<typeof challengeRulesSchema>;
export type StoryBadge = z.infer<typeof badgeSchema>;
