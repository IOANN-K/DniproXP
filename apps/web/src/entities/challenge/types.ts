import type { ImpactMetric, ImpactUnit } from "../verified-activity/types";
import type { StoryBadge } from "../mission/types";
export type CityChallengeStatus =
  | "DRAFT"
  | "UPCOMING"
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";
export type CityChallengeGoal = {
  id: string;
  metric: ImpactMetric;
  targetValue: number;
  unit: ImpactUnit;
  description: string;
  isOptional: boolean;
};
export type ChallengeReward = {
  xp: number;
  rewardPoints: number;
  achievement: StoryBadge;
};
export type CityChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  status: CityChallengeStatus;
  goals: CityChallengeGoal[];
  relatedQuestIds: string[];
  participantIds: string[];
  rewards: ChallengeReward;
  createdAt: string;
};
export type ChallengeContribution = {
  id: string;
  challengeId: string;
  goalId: string;
  userId: string;
  questId: string;
  participationId: string;
  verifiedActivityId: string;
  impactRecordId?: string;
  metric: ImpactMetric;
  value: number;
  unit: ImpactUnit;
  occurredAt: string;
  scope: "PERSONAL" | "QUEST";
};
export type ChallengeParticipant = {
  challengeId: string;
  userId: string;
  joinedAt: string;
};
export type ChallengeGoalProgress = CityChallengeGoal & {
  actualValue: number;
  percentage: number;
  complete: boolean;
};
export type ChallengeRankingEntry = {
  userId: string;
  hours: number;
  quests: number;
};
export type ChallengeProgressResult = {
  challengeId: string;
  status: CityChallengeStatus;
  goals: ChallengeGoalProgress[];
  percentage: number;
  complete: boolean;
  contributorCount: number;
  participantCount: number;
  participants: string[];
  ranking: ChallengeRankingEntry[];
  hours: number;
  contributions: ChallengeContribution[];
};
