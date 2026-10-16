import type { ActivityEvent, ImpactRecord } from "./impact/types";
export type { ActivityEvent, ActivityKind } from "./impact/types";
import type { IdentityState } from "./identity-types";
import type { ExplorationState } from "./exploration-types";
export type QuestCategory = {
  id: string;
  name: string;
  description: string;
  icon: "leaf" | "heart" | "paw" | "palette" | "book" | "building";
  color: string;
};
export type Organization = {
  id: string;
  name: string;
  description: string;
  initials: string;
  focus?: string;
  email?: string;
  website?: string;
  moderation?: "pending" | "approved" | "suspended";
  moderationReason?: string;
};
export type User = {
  id: string;
  name: string;
  xp: number;
  level: number;
  questsCompleted: number;
  initials: string;
  bio?: string;
  avatar?: string;
};
export type Quest = {
  allowTeamParticipation?: boolean;
  teamParticipantLimit?: number;
  id: string;
  title: string;
  description: string;
  categoryId: string;
  organizationId: string;
  district: string;
  address: string;
  date: string;
  duration: string;
  difficulty: "Легкий" | "Середній" | "Складний";
  xp: number;
  capacity: number;
  participants: number;
  image: string;
  imageAlt: string;
  status: "available" | "completed";
  requirements: string[];
  bring: string[];
  lifecycle?: QuestLifecycle;
  moderation?: "pending" | "approved" | "rejected";
  moderationReason?: string;
  fullDescription?: string;
  instructions?: string;
  rewardPoints?: number;
  createdAt?: string;
  updatedAt?: string;
  coordinates: [number, number] | null;
  coordinateSource?: string;
  locationLabel?: string;
};
export type Participation = {
  teamParticipationId?: string;
  id: string;
  questId: string;
  userId: string;
  status: "planned" | "active" | "pending" | "completed" | "cancelled";
  applicationStatus?: "pending" | "approved" | "rejected";
  applicationReason?: string;
  reportRejectionReason?: string;
  reportHistory?: QuestReport[];
  awardedXp?: number;
  awardedPoints?: number;
  report?: QuestReport;
  confirmedAt?: string;
  updatedAt?: string;
  createdAt: string;
};
export type Achievement = {
  id: string;
  name: string;
  description: string;
  target: number;
  icon: "sprout" | "flame" | "trophy";
};
export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  organizationId: string;
  category: "Напої та їжа" | "Екотовари" | "Враження" | "Мерч";
  stock: number;
  details: string;
};

export type QuestReport = {
  actualHours?: number;
  text: string;
  photo: string | null;
  photoName: string | null;
  submittedAt: string;
};
export type Transaction = {
  kind?:
    | "QUEST_COMPLETION"
    | "REWARD_REDEMPTION"
    | "MISSION_REWARD"
    | "CHALLENGE_REWARD";
  sourceId?: string;
  id: string;
  userId: string;
  questId?: string;
  rewardId?: string;
  xp: number;
  points: number;
  date: string;
  description: string;
};
export type Redemption = {
  id: string;
  userId: string;
  rewardId: string;
  cost: number;
  code: string;
  date: string;
};
export type ProfileData = { name: string; bio: string; avatar: string | null };
export type VolunteerStats = User & {
  bio: string;
  avatar: string;
  points: number;
  hours: number;
  nextLevelXp: number | null;
  levelStartXp: number;
  progress: number;
};
export type VolunteerState = {
  version: 5;
  identity?: IdentityState;
  impactRecords: ImpactRecord[];
  identityRejectedSnapshot?: unknown;
  exploration?: ExplorationState;
  explorationRejectedSnapshot?: unknown;
  accounts: DemoAccount[];
  organizations: Organization[];
  questRecords: Quest[];
  nextId: number;
  demoQuestId?: string;
  revision: number;
  profiles: Record<string, ProfileData>;
  participations: Participation[];
  transactions: Transaction[];
  redemptions: Redemption[];
  activity: ActivityEvent[];
  clock: number;
};

export type Role = "VOLUNTEER" | "ORGANIZER" | "ADMIN";
export type QuestLifecycle =
  "draft" | "published" | "active" | "completed" | "cancelled";
export type DemoAccount = {
  id: string;
  email: string;
  role: Role;
  organizationId?: string;
};
export type SessionUser = User & DemoAccount;
export type RegistrationInput = {
  name: string;
  email: string;
  code: string;
  role: "VOLUNTEER" | "ORGANIZER";
  organizationName?: string;
};
export type QuestFormValues = {
  allowTeamParticipation?: boolean;
  teamParticipantLimit?: number;
  title: string;
  description: string;
  fullDescription: string;
  categoryId: string;
  district: string;
  address: string;
  date: string;
  time: string;
  capacity: number;
  difficulty: Quest["difficulty"];
  xp: number;
  rewardPoints: number;
  image: string;
  requirements: string;
  bring: string;
  instructions: string;
  durationHours: number;
  locationId: string;
};
