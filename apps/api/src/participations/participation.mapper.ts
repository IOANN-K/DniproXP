import type {
  QuestApplication,
  ParticipationReport,
} from './participation.entity.js';
import type {
  ApplicationDto,
  ReportDto,
  VerifiedActivityDto,
} from './participation.dto.js';
import type { QuestDto } from '../quests/quests.dto.js';
import type { VerifiedActivity } from '../ledger/ledger.entity.js';
export function applicationView(
  row: QuestApplication,
  quest: QuestDto,
): ApplicationDto {
  return {
    id: row.id,
    questId: row.questId,
    userId: row.userId,
    status: row.status,
    reason: row.reason,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    quest,
  };
}
export function reportView(row: ParticipationReport): ReportDto {
  return {
    id: row.id,
    participationId: row.participationId,
    submittedByUserId: row.submittedByUserId,
    description: row.description,
    reportedMinutes: row.reportedMinutes,
    evidenceReferences: row.evidenceReferences,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: row.reviewedByUserId,
    reviewReason: row.reviewReason,
  };
}
export function activityView(row: VerifiedActivity): VerifiedActivityDto {
  return {
    id: row.id,
    userId: row.userId,
    questId: row.questId,
    organizationId: row.organizationId,
    participationId: row.participationId,
    reportId: row.reportId,
    verifiedMinutes: row.verifiedMinutes,
    xpAwarded: row.xpAwarded,
    rewardPointsAwarded: row.rewardPointsAwarded,
    categoryId: row.categoryId,
    district: row.district,
    sourceEventId: row.sourceEventId,
    verifiedByUserId: row.verifiedByUserId,
    verifiedAt: row.verifiedAt.toISOString(),
  };
}
