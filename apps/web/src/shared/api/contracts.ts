import { z } from "zod";
export const roleSchema = z.enum(["VOLUNTEER", "ORGANIZER", "ADMIN"]);
export const userSchema = z.object({
  id: z.uuid(), email: z.email(), displayName: z.string(), bio: z.string().nullable(), avatarUrl: z.string().nullable(),
  roles: z.array(roleSchema), primaryRole: roleSchema, status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  createdAt: z.string(), updatedAt: z.string(), lastLoginAt: z.string().nullable(), statistics: z.object({ available: z.literal(false) }),
});
export type ApiUser = z.infer<typeof userSchema>;
export const authSchema = z.object({ accessToken: z.string().min(1), tokenType: z.literal("Bearer"), expiresIn: z.number().positive(), user: userSchema });
export type AuthResponse = z.infer<typeof authSchema>;
export const preferencesSchema = z.object({
  publicProfile: z.boolean(), showDisplayName: z.boolean(), showActivityHistory: z.boolean(), showTeams: z.boolean(),
  showVerifiedHours: z.boolean(), showAchievements: z.boolean(), showSkillProgress: z.boolean(), showOrganizations: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const publicUserSchema = z.object({ restricted: z.boolean(), id: z.uuid().optional(), displayName: z.string().optional(),
  avatarUrl: z.string().nullable().optional(), bio: z.string().nullable().optional(), joinDate: z.string().optional(), passportUrl: z.string().optional() });
export const progressionSchema = z.object({ totalXP: z.number(), rewardPointsBalance: z.number(), currentLevel: z.number(), levelName: z.string(),
  nextLevelXP: z.number().nullable(), xpToNextLevel: z.number().nullable(), progress: z.number(), verifiedQuestsCount: z.number(), verifiedMinutes: z.number().nullable(), unknownMinutesCount: z.number() });
export const pageMetaSchema = z.object({ page: z.number(), pageSize: z.number(), total: z.number() });
export const ledgerEntrySchema = z.object({ id: z.uuid(), currency: z.enum(["XP", "REWARD_POINTS"]), amount: z.number(), transactionType: z.string(),
  sourceType: z.string(), sourceId: z.uuid(), createdAt: z.string(), metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])) });
export const ledgerPageSchema = z.object({ items: z.array(ledgerEntrySchema), meta: pageMetaSchema });
const badgeSchema = z.object({ id: z.string(), title: z.string(), description: z.string(), icon: z.string().optional() });
const unlockSchema = z.object({ id: z.uuid(), achievementId: z.string().nullable(), badge: badgeSchema, unlockedAt: z.string().optional(), evidenceIds: z.array(z.string()).optional() });
const distribution = z.object({ key: z.string(), contributions: z.number(), hours: z.number().nullable() });
const publicSkill = z.object({ skillId: z.uuid(), level: z.number().int().min(0).max(4), unlocked: z.boolean(), evidenceStatus: z.string(),
  earnedXp: z.number().optional(), percentage: z.number().optional(), nextLevelXp: z.number().nullable().optional() });
const publicActivity = z.object({ id: z.string(), questId: z.uuid(), title: z.string(), confirmedAt: z.string(), credentialId: z.string(), hours: z.number().nullable().optional() });
export const passportContentSchema = z.object({
  userId: z.uuid(), passportId: z.string(), displayName: z.string().optional(), avatar: z.string().nullable().optional(), bio: z.string().nullable().optional(),
  joinDate: z.string(), volunteerSince: z.string().nullable(), volunteerLevel: z.number(), totalXp: z.number(), completedQuests: z.number(),
  statistics: z.object({ completedQuests: z.number(), verifiedHours: z.number().nullable().optional(), unknownMinutesCount: z.number().optional(), organizations: z.number().optional(), categories: z.array(distribution).optional(), districts: z.array(distribution).optional() }),
  achievements: z.array(unlockSchema).optional(), achievementsTotal: z.number().optional(), skillProgress: z.array(publicSkill).optional(), skillsTotal: z.number().optional(),
  organizationExperience: z.array(z.object({ organizationId: z.uuid(), name: z.string(), completedQuests: z.number(), verifiedHours: z.number().nullable().optional() })).optional(), organizationsTotal: z.number().optional(),
  teams: z.array(z.object({ id: z.uuid(), slug: z.string(), name: z.string(), role: z.enum(["OWNER","MANAGER","MEMBER"]), joinedAt: z.string() })).optional(), teamsTotal: z.number().optional(),
  activityHistory: z.array(publicActivity).optional(),
});
export type PassportContent = z.infer<typeof passportContentSchema>;
export const publicPassportSchema = z.discriminatedUnion("restricted", [z.object({ restricted: z.literal(true) }), z.object({ restricted: z.literal(false), passport: passportContentSchema })]);
export const privatePassportSchema = passportContentSchema.extend({ visibilitySettings: preferencesSchema, rewardPointsBalance: z.number(), receiptsTotal: z.number(),
  receipts: z.array(z.object({ id: z.uuid(), publicReference: z.string(), questId: z.uuid(), verifiedAt: z.string(), verifiedMinutes: z.number().nullable() })) });
export const activityPageSchema = z.object({ items: z.array(publicActivity), total: z.number(), page: z.number(), pageSize: z.number() });
export const achievementPageSchema = z.object({ items: z.array(unlockSchema), total: z.number(), page: z.number(), pageSize: z.number() });
export type PageInput = { page?: number; pageSize?: number; order?: "ASC" | "DESC" };

export const skillDefinitionsPageSchema = z.object({ items: z.array(z.object({ id: z.uuid(), title: z.string(), description: z.string() })), total: z.number(), page: z.number(), pageSize: z.number() });
