import type {
  VerifiedActivity,
  QuestImpactMeasurement,
} from "../verified-activity/types";
import type {
  CityChallenge,
  ChallengeContribution,
  ChallengeParticipant,
  ChallengeProgressResult,
} from "./types";
import type { Transaction } from "../types";
export function challengeActivities(
  c: CityChallenge,
  activities: VerifiedActivity[],
) {
  if (c.status === "DRAFT" || c.status === "CANCELLED") return [];
  const start = Date.parse(c.startDate),
    end = Date.parse(c.endDate);
  return [
    ...new Map(
      activities
        .filter(
          (a) =>
            a.id === `completion:${a.userId}:${a.questId}` &&
            Number.isFinite(a.hours) &&
            a.hours >= 0 &&
            c.relatedQuestIds.includes(a.questId) &&
            Date.parse(a.occurredAt) >= start &&
            Date.parse(a.occurredAt) <= end,
        )
        .map((a) => [a.id, a]),
    ).values(),
  ];
}
export function challengeContributions(
  c: CityChallenge,
  activities: VerifiedActivity[],
  measurements: QuestImpactMeasurement[],
): ChallengeContribution[] {
  if (c.status === "DRAFT" || c.status === "CANCELLED") return [];
  const verified = challengeActivities(c, activities);
  const unique = new Map<string, ChallengeContribution>();
  for (const goal of c.goals) {
    if (goal.metric === "VOLUNTEER_HOURS")
      for (const a of verified) {
        const id = `contribution:${c.id}:${goal.id}:${a.id}`;
        if (!unique.has(id))
          unique.set(id, {
            id,
            challengeId: c.id,
            goalId: goal.id,
            userId: a.userId,
            questId: a.questId,
            participationId: a.participationId,
            verifiedActivityId: a.id,
            metric: goal.metric,
            value: a.hours,
            unit: goal.unit,
            occurredAt: a.occurredAt,
            scope: "PERSONAL",
          });
      }
    else
      for (const m of measurements.filter(
        (m) =>
          m.metric === goal.metric &&
          m.unit === goal.unit &&
          Number.isFinite(m.value) &&
          m.value >= 0 &&
          c.relatedQuestIds.includes(m.questId),
      )) {
        const a = verified
          .filter((a) => a.questId === m.questId)
          .sort(
            (a, b) =>
              Date.parse(a.occurredAt) - Date.parse(b.occurredAt) ||
              a.id.localeCompare(b.id),
          )[0];
        if (!a) continue;
        const id = `contribution:${c.id}:${goal.id}:${m.id}`;
        // userId is verification provenance, NOT personal ownership of the collective outcome.
        if (!unique.has(id))
          unique.set(id, {
            id,
            challengeId: c.id,
            goalId: goal.id,
            userId: a.userId,
            questId: m.questId,
            participationId: a.participationId,
            verifiedActivityId: a.id,
            impactRecordId: m.id,
            metric: m.metric,
            value: m.value,
            unit: m.unit,
            occurredAt: a.occurredAt,
            scope: "QUEST",
          });
      }
  }
  return [...unique.values()];
}
export function challengeProgress(
  c: CityChallenge,
  activities: VerifiedActivity[],
  measurements: QuestImpactMeasurement[],
  participants: ChallengeParticipant[],
  now: number,
): ChallengeProgressResult {
  const contributions = challengeContributions(c, activities, measurements);
  const eligible = ["DRAFT", "CANCELLED"].includes(c.status)
    ? []
    : challengeActivities(c, activities);
  const goals = c.goals.map((g) => {
    const actualValue = contributions
      .filter(
        (t) => t.goalId === g.id && t.metric === g.metric && t.unit === g.unit,
      )
      .reduce((n, t) => n + t.value, 0);
    return {
      ...g,
      actualValue,
      percentage: Math.min(100, (actualValue / g.targetValue) * 100),
      complete: actualValue >= g.targetValue,
    };
  });
  const required = goals.filter((g) => !g.isOptional);
  const complete =
    required.length > 0 &&
    required.every((g) => g.complete) &&
    !["DRAFT", "CANCELLED"].includes(c.status);
  const status =
    c.status === "DRAFT" || c.status === "CANCELLED"
      ? c.status
      : complete
        ? "COMPLETED"
        : now < Date.parse(c.startDate)
          ? "UPCOMING"
          : now > Date.parse(c.endDate)
            ? "EXPIRED"
            : "ACTIVE";
  const ids = [
    ...new Set([
      ...c.participantIds,
      ...participants
        .filter((p) => p.challengeId === c.id)
        .map((p) => p.userId),
      ...eligible.map((a) => a.userId),
    ]),
  ];
  const ranking = [...new Set(eligible.map((a) => a.userId))]
    .map((userId) => {
      const mine = eligible.filter((a) => a.userId === userId);
      return {
        userId,
        hours: mine.reduce((n, a) => n + a.hours, 0),
        quests: new Set(mine.map((a) => a.questId)).size,
      };
    })
    .sort(
      (a, b) =>
        b.hours - a.hours ||
        b.quests - a.quests ||
        a.userId.localeCompare(b.userId),
    );
  return {
    challengeId: c.id,
    status,
    goals,
    complete,
    percentage: required.length
      ? Math.min(...required.map((g) => g.percentage))
      : 0,
    contributorCount: ranking.length,
    participantCount: ids.length,
    participants: ids,
    ranking,
    hours: eligible.reduce((n, a) => n + a.hours, 0),
    contributions,
  };
}
export function personalChallengeContribution(
  c: CityChallenge,
  userId: string,
  activities: VerifiedActivity[],
  contributions: ChallengeContribution[],
) {
  const mine = challengeActivities(c, activities).filter(
    (a) => a.userId === userId,
  );
  const questIds = [...new Set(mine.map((a) => a.questId))];
  return {
    hours: mine.reduce((n, a) => n + a.hours, 0),
    quests: questIds.length,
    sharedResults: contributions.filter(
      (t) =>
        t.challengeId === c.id &&
        t.scope === "QUEST" &&
        questIds.includes(t.questId),
    ),
  };
}
export function teamChallengeContribution(
  c: CityChallenge,
  userIds: string[],
  activities: VerifiedActivity[],
  contributions: ChallengeContribution[],
) {
  const eligible = challengeActivities(c, activities).filter((a) =>
    userIds.includes(a.userId),
  );
  const quests = new Set(eligible.map((a) => a.questId));
  return {
    hours: eligible.reduce((n, a) => n + a.hours, 0),
    volunteers: new Set(eligible.map((a) => a.userId)).size,
    goals: c.goals.map((g) => ({
      ...g,
      actualValue: contributions
        .filter(
          (t) =>
            t.challengeId === c.id &&
            t.goalId === g.id &&
            t.unit === g.unit &&
            (t.scope === "PERSONAL"
              ? userIds.includes(t.userId)
              : quests.has(t.questId)),
        )
        .reduce((n, t) => n + t.value, 0),
    })),
  };
}
export function challengeRewardAvailable(
  c: CityChallenge,
  userId: string,
  result: ChallengeProgressResult,
  activities: VerifiedActivity[],
  transactions: Transaction[],
) {
  return (
    result.complete &&
    challengeActivities(c, activities).some((a) => a.userId === userId) &&
    !transactions.some(
      (t) =>
        t.id === `challenge:${c.id}:${userId}` && t.kind === "CHALLENGE_REWARD",
    )
  );
}
