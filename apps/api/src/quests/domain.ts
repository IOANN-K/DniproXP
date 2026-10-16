export enum QuestLifecycle {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}
export enum QuestModeration {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
export enum QuestCategory {
  ECO = 'eco',
  SOCIAL = 'social',
  ANIMALS = 'animals',
  CULTURE = 'culture',
  EDUCATION = 'education',
  CITY = 'city',
}
export enum QuestDifficulty {
  EASY = 'Легкий',
  MEDIUM = 'Середній',
  HARD = 'Складний',
}
export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}
export enum ParticipationStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
export enum ReportStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
export enum Currency {
  XP = 'XP',
  REWARD_POINTS = 'REWARD_POINTS',
}
export enum LedgerType {
  QUEST_COMPLETION = 'QUEST_COMPLETION',
  COMPENSATION = 'COMPENSATION',
  REDEMPTION = 'REDEMPTION',
}
