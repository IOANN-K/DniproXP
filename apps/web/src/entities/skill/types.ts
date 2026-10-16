export type SkillCategory =
  | "eco"
  | "social"
  | "events"
  | "education"
  | "communication"
  | "leadership"
  | "logistics"
  | "digital";
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export type SkillPrerequisite = { skillId: string; minLevel: SkillLevel };
export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon:
    | "leaf"
    | "heart"
    | "calendar"
    | "book"
    | "message"
    | "flag"
    | "package"
    | "code";
  levelThresholds: number[];
  prerequisiteSkillIds: string[];
  prerequisites: SkillPrerequisite[];
  eligibleQuestCategories: string[];
  experienceRules: { baseXp: number; xpPerHour: number; requiresTeam: boolean };
};
export type SkillEvidence = {
  id: string;
  skillId: string;
  sourceActivityId: string;
  questId: string;
  questTitle: string;
  earnedXp: number;
  hours?: number;
  confirmedAt: string;
};
export type SkillProgress = {
  skillId: string;
  userId: string;
  earnedXp: number;
  level: SkillLevel;
  unlocked: boolean;
  percentage: number;
  nextLevelXp: number | null;
  evidence: SkillEvidence[];
  lockReasons: string[];
};
