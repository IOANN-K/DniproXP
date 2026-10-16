import { verifiedActivities } from "../entities/verified-activity/adapter";
import type { VolunteerState } from "../entities/types";
import type { IdentityState } from "../entities/identity-types";
import { identitySeed, defaultPassportVisibility } from "./identity-data";
export function identityOf(s: VolunteerState): IdentityState {
  if (!s.identity) throw new Error("Простір спільноти ще не ініціалізований.");
  return s.identity;
}
export function initializeIdentity(s: VolunteerState) {
  if (!s.identity) s.identity = identitySeed(s);
  try {
    validateIdentity(s);
  } catch (error) {
    const savedPassports = s.identity?.passports;
    s.identityRejectedSnapshot = s.identity;
    for (const p of s.participations) p.teamParticipationId = undefined;
    s.identity = identitySeed(s);
    for (const account of s.accounts.filter((a) => a.role === "VOLUNTEER")) {
      const previous = savedPassports?.[account.id];
      const valid =
        previous &&
        previous.passportId &&
        Number.isFinite(Date.parse(previous.joinDate)) &&
        previous.visibility &&
        Object.keys(defaultPassportVisibility).every((key) =>
          Object.hasOwn(previous.visibility, key),
        ) &&
        Object.values(previous.visibility).every(
          (value) => typeof value === "boolean",
        );
      s.identity.passports[account.id] = valid
        ? structuredClone(previous)
        : {
            passportId: `DNX-${encodeURIComponent(account.id)}`,
            joinDate: new Date(s.clock).toISOString(),
            visibility: { ...defaultPassportVisibility, publicProfile: false },
          };
    }
    s.identity.recoveryMessage = `Відновлено демонстраційні команди: ${error instanceof Error ? error.message : "Некоректні дані."}`;
  }
  normalizeTeamQuestSettings(s);
  reconcileIdentity(s);
}
// Backfill legacy demo quests once. The guard also makes subsequent loads a
// no-op and preserves explicit opt-outs and organizer-configured limits.
function normalizeTeamQuestSettings(s: VolunteerState) {
  const ids = new Set([
    "demo-city-team",
    "quest-1",
    "quest-4",
    "quest-7",
    "quest-14",
    "quest-20",
    ...identityOf(s).teamQuests
      .filter((record) => record.id.startsWith("team-quest-seed-"))
      .map((record) => record.questId),
  ]);
  for (const quest of s.questRecords) {
    if (!ids.has(quest.id)) continue;
    if (quest.allowTeamParticipation === undefined)
      quest.allowTeamParticipation = true;
    if (
      quest.allowTeamParticipation &&
      quest.teamParticipantLimit === undefined
    )
      quest.teamParticipantLimit = 8;
  }
}
export function validateIdentity(s: VolunteerState) {
  const i = identityOf(s);
  if (
    i.schemaVersion !== 1 ||
    ![i.teams, i.memberships, i.invitations, i.teamQuests, i.events].every(
      Array.isArray,
    ) ||
    !i.passports
  )
    throw new Error("Невідома версія або структура спільноти.");
  for (const list of [i.teams, i.memberships, i.invitations, i.teamQuests])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw new Error("Повторні ідентифікатори спільноти.");
  for (const t of i.teams) {
    const active = i.memberships.filter(
      (m) => m.teamId === t.id && m.status === "ACTIVE",
    );
    if (
      !s.accounts.some((a) => a.id === t.ownerId && a.role === "VOLUNTEER") ||
      !Number.isInteger(t.maxMembers) ||
      t.maxMembers < 2 ||
      active.length > t.maxMembers ||
      active.filter((m) => m.role === "OWNER").length !== 1 ||
      !active.some((m) => m.userId === t.ownerId && m.role === "OWNER")
    )
      throw new Error("Некоректний власник або місткість команди.");
  }
  if (
    new Set(i.teams.map((t) => t.slug)).size !== i.teams.length ||
    new Set(
      i.memberships
        .filter((m) => m.status === "ACTIVE")
        .map((m) => `${m.teamId}:${m.userId}`),
    ).size !== i.memberships.filter((m) => m.status === "ACTIVE").length
  )
    throw new Error("Повторні членства чи адреси команд.");
  for (const m of i.memberships)
    if (
      !i.teams.some((t) => t.id === m.teamId) ||
      !s.accounts.some((a) => a.id === m.userId && a.role === "VOLUNTEER")
    )
      throw new Error("Невідомий учасник команди.");
  for (const inv of i.invitations)
    if (
      !i.teams.some((t) => t.id === inv.teamId) ||
      !s.accounts.some(
        (a) => a.id === inv.invitedUserId && a.role === "VOLUNTEER",
      ) ||
      !s.accounts.some((a) => a.id === inv.invitedBy) ||
      !Number.isFinite(Date.parse(inv.expiresAt))
    )
      throw new Error("Некоректне запрошення.");
  for (const [userId, p] of Object.entries(i.passports))
    if (
      !s.accounts.some((a) => a.id === userId && a.role === "VOLUNTEER") ||
      !p.passportId ||
      !Number.isFinite(Date.parse(p.joinDate)) ||
      Object.keys(defaultPassportVisibility).some(
        (key) => !Object.hasOwn(p.visibility, key),
      ) ||
      Object.values(p.visibility).some((value) => typeof value !== "boolean")
    )
      throw new Error("Некоректні налаштування паспорта.");
  for (const p of s.participations)
    if (
      p.teamParticipationId &&
      !i.teamQuests.some(
        (r) =>
          r.id === p.teamParticipationId &&
          r.questId === p.questId &&
          r.participantIds.includes(p.userId),
      )
    )
      throw new Error("Невідоме джерело командної участі.");
  for (const record of i.teamQuests)
    if (
      !i.teams.some((t) => t.id === record.teamId) ||
      !s.questRecords.some((q) => q.id === record.questId) ||
      !record.participantIds.length ||
      new Set(record.participantIds).size !== record.participantIds.length ||
      record.participantIds.some(
        (id) => !s.accounts.some((a) => a.id === id && a.role === "VOLUNTEER"),
      )
    )
      throw new Error("Некоректна командна участь.");
}
export function reconcileIdentity(s: VolunteerState) {
  const i = identityOf(s);
  for (const account of s.accounts.filter((a) => a.role === "VOLUNTEER"))
    if (!i.passports[account.id]) {
      const first = s.participations
        .filter((p) => p.userId === account.id)
        .map((p) => p.createdAt)
        .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
      i.passports[account.id] = {
        passportId: `DNX-${encodeURIComponent(account.id)}`,
        joinDate: first || new Date(s.clock).toISOString(),
        visibility: { ...defaultPassportVisibility },
      };
    }
  for (const inv of i.invitations) {
    if (inv.status !== "PENDING") continue;
    if (Date.parse(inv.expiresAt) <= s.clock) inv.status = "EXPIRED";
    else if (
      i.memberships.some(
        (m) =>
          m.teamId === inv.teamId &&
          m.userId === inv.invitedUserId &&
          m.status === "ACTIVE",
      )
    )
      inv.status = "ACCEPTED";
  }
  for (const r of i.teamQuests) {
    const entries = r.participantIds.map((id) =>
      s.participations.find(
        (p) =>
          p.userId === id &&
          p.questId === r.questId &&
          p.teamParticipationId === r.id,
      ),
    );
    const done = entries.filter((p) => p?.status === "completed");
    const live = entries.filter(
      (p) =>
        p && p.status !== "cancelled" && p.applicationStatus !== "rejected",
    );
    r.status =
      done.length && live.every((p) => p?.status === "completed")
        ? "COMPLETED"
        : done.length
          ? "PARTIAL"
          : entries.every((p) => p?.applicationStatus === "rejected")
            ? "REJECTED"
            : !live.length
              ? "CANCELLED"
              : live.some(
                    (p) => p?.status === "active" || p?.status === "pending",
                  )
                ? "IN_PROGRESS"
                : live.every((p) => p?.applicationStatus === "approved")
                  ? "APPROVED"
                  : "PENDING";
    if (
      !r.approvedAt &&
      live.length &&
      live.every((p) => p?.applicationStatus === "approved")
    )
      r.approvedAt = new Date(s.clock).toISOString();
    if (r.status === "COMPLETED")
      r.completedAt =
        done
          .map((p) => p?.confirmedAt || "")
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
  }
  const verified = verifiedActivities(
    s.participations,
    s.transactions,
    s.questRecords,
    s.clock,
  );
  for (const activity of verified) {
    const p = s.participations.find((p) => p.id === activity.participationId);
    const record = i.teamQuests.find((r) => r.id === p?.teamParticipationId);
    const id = `team-verified:${activity.id}`;
    if (record && !i.events.some((e) => e.id === id))
      i.events.unshift({
        id,
        teamId: record.teamId,
        actorId: activity.userId,
        title: `Підтверджено внесок ${s.profiles[activity.userId]?.name}: ${s.questRecords.find((q) => q.id === activity.questId)?.title}`,
        date: activity.occurredAt,
      });
  }
  validateIdentity(s);
}
