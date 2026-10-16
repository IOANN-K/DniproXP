export type TeamRole = "OWNER" | "MANAGER" | "MEMBER";
export type Team = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatar: "leaf" | "heart" | "flag" | "sun";
  coverImage:
    | "/images/nature.jpg"
    | "/images/community.jpg"
    | "/images/books.jpg"
    | "/images/dogs.jpg";
  category: "eco" | "social" | "animals" | "culture" | "education" | "city";
  city: "Дніпро";
  createdAt: string;
  ownerId: string;
  visibility: "PUBLIC" | "PRIVATE";
  maxMembers: number;
  status: "ACTIVE" | "ARCHIVED";
};
export type TeamMembership = {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  status: "ACTIVE" | "LEFT" | "REMOVED";
  joinedAt: string;
  endedAt?: string;
};
export type TeamInvitation = {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedBy: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
};
export type TeamQuestStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PARTIAL"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";
export type TeamQuestParticipation = {
  id: string;
  questId: string;
  teamId: string;
  participantIds: string[];
  status: TeamQuestStatus;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
};
export type TeamAchievement = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  value: number;
  target: number;
};
export type TeamStatistics = {
  teamId: string;
  verifiedQuests: number;
  completedQuests: number;
  verifiedParticipations: number;
  hours: number;
  xp: number;
  volunteers: number;
  rank: number;
  impacts: { metric: string; value: number; unit: string }[];
};
export type TeamEvent = {
  id: string;
  teamId: string;
  actorId: string;
  title: string;
  date: string;
};
export type TeamFormValues = Pick<
  Team,
  | "name"
  | "description"
  | "category"
  | "city"
  | "avatar"
  | "coverImage"
  | "visibility"
  | "maxMembers"
>;
export type TeamCommand =
  | { type: "SAVE_TEAM"; values: TeamFormValues; teamId?: string }
  | { type: "JOIN_TEAM" | "LEAVE_TEAM" | "ARCHIVE_TEAM"; teamId: string }
  | { type: "INVITE"; teamId: string; userId: string }
  | { type: "RESPOND_INVITE"; invitationId: string; accept: boolean }
  | { type: "REVOKE_INVITE"; invitationId: string }
  | { type: "REMOVE_MEMBER"; teamId: string; userId: string }
  | {
      type: "SET_ROLE";
      teamId: string;
      userId: string;
      role: "MANAGER" | "MEMBER";
    }
  | { type: "TRANSFER_OWNER"; teamId: string; userId: string }
  | {
      type: "APPLY_QUEST";
      teamId: string;
      questId: string;
      participantIds: string[];
    };
