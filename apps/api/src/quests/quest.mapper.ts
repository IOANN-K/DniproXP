import type { Quest } from './quest.entity.js';
import { QuestLifecycle, QuestModeration } from './domain.js';
import type {
  ManagedQuestDto,
  QuestDto,
  UpdateQuestDto,
} from './quests.dto.js';
import { locations } from './locations.js';
import { assertConfiguration } from './quest.policy.js';
export function applyQuestInput(quest: Quest, input: UpdateQuestDto): void {
  if (input.title !== undefined) quest.title = input.title;
  if (input.description !== undefined) quest.description = input.description;
  if (input.fullDescription !== undefined)
    quest.fullDescription = input.fullDescription;
  if (input.categoryId !== undefined) quest.categoryId = input.categoryId;
  if (input.difficulty !== undefined) quest.difficulty = input.difficulty;
  if (input.district !== undefined) quest.district = input.district;
  if (input.address !== undefined) quest.address = input.address;
  if (input.startAt !== undefined)
    quest.startAt = input.startAt === null ? null : new Date(input.startAt);
  if (input.endAt !== undefined)
    quest.endAt = input.endAt === null ? null : new Date(input.endAt);
  if (input.capacity !== undefined) quest.capacity = input.capacity;
  if (input.xp !== undefined) quest.xp = input.xp;
  if (input.rewardPoints !== undefined) quest.rewardPoints = input.rewardPoints;
  if (input.requirements !== undefined) quest.requirements = input.requirements;
  if (input.bring !== undefined) quest.bring = input.bring;
  if (input.instructions !== undefined) quest.instructions = input.instructions;
  if (input.image !== undefined) quest.image = input.image;
  if (input.imageAlt !== undefined) quest.imageAlt = input.imageAlt;
  if (input.allowTeamParticipation !== undefined)
    quest.allowTeamParticipation = input.allowTeamParticipation;
  if (input.teamParticipantLimit !== undefined)
    quest.teamParticipantLimit = input.teamParticipantLimit;
  if (input.locationId !== undefined) {
    const location = input.locationId ? locations[input.locationId] : undefined;
    quest.latitude = location?.latitude ?? null;
    quest.longitude = location?.longitude ?? null;
    quest.coordinateSource = location?.coordinateSource ?? null;
    quest.locationLabel = location?.locationLabel ?? null;
  }
  assertConfiguration(quest);
}
export function questView(
  quest: Quest,
  participants: number,
  organizationApproved: boolean,
): QuestDto {
  return {
    id: quest.id,
    organizationId: quest.organizationId,
    title: quest.title,
    description: quest.description,
    fullDescription: quest.fullDescription,
    categoryId: quest.categoryId,
    difficulty: quest.difficulty,
    district: quest.district,
    address: quest.address,
    coordinates:
      quest.latitude !== null && quest.longitude !== null
        ? [quest.latitude, quest.longitude]
        : null,
    coordinateSource: quest.coordinateSource,
    locationLabel: quest.locationLabel,
    startAt: quest.startAt?.toISOString() ?? null,
    endAt: quest.endAt?.toISOString() ?? null,
    date: quest.startAt?.toISOString() ?? null,
    durationMinutes:
      quest.startAt && quest.endAt
        ? (quest.endAt.getTime() - quest.startAt.getTime()) / 60000
        : null,
    capacity: quest.capacity,
    participants,
    availability:
      organizationApproved &&
      [QuestLifecycle.PUBLISHED, QuestLifecycle.ACTIVE].includes(
        quest.lifecycle,
      ) &&
      quest.moderation === QuestModeration.APPROVED &&
      !!quest.endAt &&
      quest.endAt.getTime() > Date.now() &&
      participants < quest.capacity,
    xp: quest.xp,
    rewardPoints: quest.rewardPoints,
    requirements: quest.requirements,
    bring: quest.bring,
    instructions: quest.instructions,
    image: quest.image,
    imageAlt: quest.imageAlt,
    lifecycle: quest.lifecycle,
    moderation: quest.moderation,
    archivedFrom: quest.archivedFrom,
    status:
      quest.lifecycle === QuestLifecycle.COMPLETED ||
      quest.archivedFrom === QuestLifecycle.COMPLETED
        ? 'completed'
        : 'available',
    allowTeamParticipation: quest.allowTeamParticipation,
    teamParticipantLimit: quest.teamParticipantLimit,
    createdAt: quest.createdAt.toISOString(),
    updatedAt: quest.updatedAt.toISOString(),
  };
}
export function managedQuest(
  quest: Quest,
  participants: number,
  organizationApproved: boolean,
): ManagedQuestDto {
  return {
    ...questView(quest, participants, organizationApproved),
    moderationReason: quest.moderationReason,
    reviewSubmittedAt: quest.reviewSubmittedAt?.toISOString() ?? null,
  };
}
