import type { DemoAccount, VolunteerState } from "../types";
import type {
  CollectiveImpactInput,
  ImpactRecord,
  ImpactMetricInput,
} from "./types";
import {
  attachMetrics,
  locationFor,
  validateImpactRecord,
  validateMetrics,
  validatePhoto,
} from "./domain";
import { rewardPointsFor } from "../gamification/levels";

function ownedQuest(s: VolunteerState, questId: string, verifier: DemoAccount) {
  const q = s.questRecords.find((q) => q.id === questId);
  if (
    !q ||
    verifier.role !== "ORGANIZER" ||
    q.organizationId !== verifier.organizationId ||
    !s.accounts.some(
      (a) =>
        a.id === verifier.id &&
        a.role === "ORGANIZER" &&
        a.organizationId === q.organizationId,
    )
  )
    throw new Error("Підтвердження доступне лише організатору цього квесту.");
  if (
    s.organizations.find((o) => o.id === q.organizationId)?.moderation !==
      "approved" ||
    q.moderation !== "approved"
  )
    throw new Error("Організація та квест мають бути схвалені модератором.");
  return q;
}
/** Called on a draft: repository publishes XP, impact and event in ONE commit. */
export function verifyParticipation(
  s: VolunteerState,
  questId: string,
  userId: string,
  verifier: DemoAccount,
  now: string,
) {
  const q = ownedQuest(s, questId, verifier);
  const p = s.participations.find(
    (p) => p.questId === questId && p.userId === userId,
  );
  if (!p) throw new Error("Участь не знайдено.");
  const sourceEventId = `completion:${userId}:${questId}`;
  const existing = s.impactRecords.find(
    (r) => r.sourceEventId === sourceEventId,
  );
  if (
    p.status === "completed" &&
    existing &&
    s.transactions.some((t) => t.id === sourceEventId)
  )
    return existing;
  if (
    p.status !== "pending" ||
    !p.report ||
    p.applicationStatus !== "approved" ||
    !["published", "active"].includes(q.lifecycle || "")
  )
    throw new Error("Потрібен звіт схваленого учасника активного квесту.");
  if (existing || s.transactions.some((t) => t.id === sourceEventId))
    throw new Error("Знайдено неузгоджений запис підтвердження.");
  const metrics: ImpactMetricInput[] =
    p.report.actualHours === undefined
      ? []
      : [
          {
            type: "volunteer_hours",
            value: p.report.actualHours,
            unit: "hours",
          },
        ];
  const id = `impact:${sourceEventId}`;
  const points = q.rewardPoints ?? rewardPointsFor(q.xp);
  const record: ImpactRecord = {
    id,
    sourceEventId,
    questId,
    participationId: p.id,
    userId,
    organizationId: q.organizationId,
    scope: "individual",
    verificationStatus: "verified",
    verifiedAt: now,
    verifiedBy: verifier.id,
    provenance: "organizer-confirmation",
    location: locationFor(q),
    metrics: attachMetrics(id, metrics),
    beforePhoto: null,
    afterPhoto: null,
    summary: p.report.text,
    questTitle: q.title,
    categoryId: q.categoryId,
    organizationName: s.organizations.find((o) => o.id === q.organizationId)!
      .name,
    awardedXp: q.xp,
    awardedPoints: points,
  };
  validateImpactRecord(record); // validate BEFORE mutating even the draft
  p.status = "completed";
  p.confirmedAt = now;
  p.updatedAt = now;
  p.awardedXp = q.xp;
  p.awardedPoints = points;
  s.transactions.push({
    id: sourceEventId,
    kind: "QUEST_COMPLETION",
    sourceId: p.id,
    userId,
    questId,
    xp: q.xp,
    points,
    date: now,
    description: `Організатор підтвердив: ${q.title}`,
  });
  s.impactRecords.push(record);
  s.activity.unshift({
    id: `activity:${sourceEventId}`,
    sourceEventId,
    type: "confirm",
    kind: "confirm",
    userId,
    questId,
    participationId: p.id,
    organizationId: q.organizationId,
    occurredAt: now,
    date: now,
    title: `Участь підтверджено: +${q.xp} XP та +${points} бонусних балів`,
    metadata: { impactRecordId: id, verifiedBy: verifier.id },
  });
  return record;
}
/** One replaceable TOTAL for the quest. Never multiply a group result by participant count. */
export function verifyCollectiveImpact(
  s: VolunteerState,
  questId: string,
  verifier: DemoAccount,
  input: CollectiveImpactInput,
  now: string,
) {
  const q = ownedQuest(s, questId, verifier);
  if (
    q.lifecycle === "cancelled" ||
    !s.participations.some(
      (p) => p.questId === questId && p.status === "completed",
    )
  )
    throw new Error(
      "Спершу підтвердь виконання хоча б одного учасника доступного квесту.",
    );
  if (
    input.summary.trim().length < 10 ||
    input.summary.length > 2000 ||
    !input.metrics.length
  )
    throw new Error(
      "Додай опис результату (10–2000 символів) і хоча б одну виміряну метрику.",
    );
  validateMetrics(input.metrics, "collective");
  validatePhoto(input.beforePhoto);
  validatePhoto(input.afterPhoto);
  const id = `impact:collective:${questId}`,
    sourceEventId = `collective:${questId}`;
  const record: ImpactRecord = {
    id,
    sourceEventId,
    questId,
    participationId: null,
    userId: null,
    organizationId: q.organizationId,
    scope: "collective",
    verificationStatus: "verified",
    verifiedAt: now,
    verifiedBy: verifier.id,
    provenance: "organizer-confirmation",
    location: locationFor(q),
    metrics: attachMetrics(id, input.metrics),
    beforePhoto: input.beforePhoto,
    afterPhoto: input.afterPhoto,
    summary: input.summary.trim(),
    questTitle: q.title,
    categoryId: q.categoryId,
    organizationName: s.organizations.find((o) => o.id === q.organizationId)!
      .name,
    awardedXp: 0,
    awardedPoints: 0,
  };
  validateImpactRecord(record);
  const index = s.impactRecords.findIndex(
    (r) => r.sourceEventId === sourceEventId,
  );
  if (index === -1) s.impactRecords.push(record);
  else s.impactRecords[index] = record;
  // Updating a group total updates its event, does not append a second logical event.
  const evt = {
    id: `activity:${sourceEventId}`,
    sourceEventId,
    type: "impact" as const,
    kind: "impact" as const,
    userId: verifier.id,
    questId,
    organizationId: q.organizationId,
    occurredAt: now,
    date: now,
    title: `Спільний результат підтверджено: ${q.title}`,
    metadata: { impactRecordId: id },
  };
  s.activity = [
    evt,
    ...s.activity.filter((e) => e.sourceEventId !== sourceEventId),
  ];
  return record;
}
