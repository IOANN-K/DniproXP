import type { SkillProgress } from "../skill/types";
export type PassportVisibilitySettings = {
  publicProfile: boolean;
  showVerifiedHours: boolean;
  showAchievements: boolean;
  showSkillProgress: boolean;
  showActivityHistory: boolean;
  showOrganizations: boolean;
};
export type PassportStatistics = {
  verifiedHours: number;
  completedQuests: number;
  organizations: number;
};
export type PassportVerificationRecord = {
  credentialId: string;
  sourceActivityId: string;
  issuedAt: string;
  issuedBy: string;
  verificationStatus: "DEMO_CONFIRMED";
  evidenceReferences: string[];
};
export type PassportCredential = {
  id: string;
  userId: string;
  title: string;
  questId: string;
  hours?: number;
  verification: PassportVerificationRecord;
};
export type PassportActivity = {
  id: string;
  questId: string;
  title: string;
  confirmedAt: string;
  hours?: number;
  credentialId: string;
};
export type PassportOrganizationExperience = {
  organizationId: string;
  name: string;
  completedQuests: number;
  verifiedHours?: number;
};
export type PassportAchievement = {
  id: string;
  title: string;
  description: string;
  href?: string;
};
export type VolunteerPassport = {
  userId: string;
  passportId: string;
  displayName: string;
  avatar: string | null;
  joinDate: string;
  volunteerLevel: number;
  totalXp: number;
  verifiedHours?: number;
  completedQuests: number;
  achievements?: PassportAchievement[];
  skillProgress?: SkillProgress[];
  organizationExperience?: PassportOrganizationExperience[];
  activityHistory?: PassportActivity[];
  visibilitySettings?: PassportVisibilitySettings;
  demo: true;
};
export type PassportView =
  | { restricted: true }
  | { restricted: false; passport: VolunteerPassport };
