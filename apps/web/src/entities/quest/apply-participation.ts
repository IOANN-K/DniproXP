import type { VolunteerState, Participation } from "../types";
// Both personal and team applications reserve the same individual seats.
export function applyParticipation(
  s: VolunteerState,
  questId: string,
  userId: string,
  now: string,
): Participation {
  const q = s.questRecords.find((q) => q.id === questId);
  if (
    !q ||
    !["published", "active"].includes(q.lifecycle || "") ||
    q.moderation !== "approved" ||
    s.organizations.find((o) => o.id === q.organizationId)?.moderation !==
      "approved"
  )
    throw new Error("Запис на цей квест недоступний.");
  const old = s.participations.find(
    (p) => p.questId === questId && p.userId === userId,
  );
  if (old && old.status !== "cancelled" && old.applicationStatus !== "rejected")
    return old;
  if (old?.applicationStatus === "rejected")
    throw new Error(
      "Організатор відхилив заявку. Повторне подання на цей квест недоступне.",
    );
  const occupied =
    q.participants +
    s.participations.filter(
      (p) =>
        p.questId === questId &&
        p.status !== "cancelled" &&
        p.applicationStatus !== "rejected",
    ).length;
  if (occupied >= q.capacity) throw new Error("Усі місця зайняті.");
  if (old) {
    old.status = "planned";
    old.applicationStatus = "pending";
    old.report = undefined;
    old.updatedAt = now;
    old.teamParticipationId = undefined;
    return old;
  }
  const p: Participation = {
    id: `p-${userId}-${questId}`,
    questId,
    userId,
    status: "planned",
    applicationStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  s.participations.push(p);
  return p;
}
