import type { Quest } from "../types";
export type QuestChainStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ACTIVE"
  | "COMPLETED"
  | "ARCHIVED";
export type QuestChainStepStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";
export type StoryBadge = { id: string; title: string; description: string };
export type QuestChainReward = {
  xp: number;
  rewardPoints: number;
  achievement: StoryBadge;
};
export type QuestChainStep = {
  id: string;
  chainId: string;
  questId: string;
  title: string;
  description: string;
  order: number;
  isOptional: boolean;
  prerequisiteStepIds: string[];
};
export type QuestChain = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  coverImage: string;
  category: string;
  difficulty: Quest["difficulty"];
  organizationId: string;
  steps: QuestChainStep[];
  prerequisites: { chainIds: string[]; questIds: string[]; minLevel: number };
  rewards: QuestChainReward;
  status: QuestChainStatus;
  startsAt: string | null;
  endsAt: string | null;
  estimatedDuration: string;
};
export type MissionStepProgress = {
  stepId: string;
  status: QuestChainStepStatus;
  confirmedAt: string | null;
  reason: string | null;
};
export type QuestChainProgress = {
  chainId: string;
  userId: string;
  status: QuestChainStepStatus;
  steps: MissionStepProgress[];
  requiredCompleted: number;
  requiredTotal: number;
  optionalCompleted: number;
  optionalTotal: number;
  percentage: number;
  nextStepId: string | null;
  completedAt: string | null;
  rewardClaimed: boolean;
  reasons: string[];
  enrolled: boolean;
};
export type MissionEnrollment = {
  id: string;
  chainId: string;
  userId: string;
  joinedAt: string;
};
