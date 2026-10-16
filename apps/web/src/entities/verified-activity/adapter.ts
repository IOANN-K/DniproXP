import type { Participation, Quest, Transaction } from "../types";
import type { VerifiedActivity } from "./types";
// The only verification source is the existing completed participation + base ledger entry.
export function verifiedActivities(
  participations: Participation[],
  transactions: Transaction[],
  quests: Quest[],
  now: number,
): VerifiedActivity[] {
  const byQuest = new Map(quests.map((q) => [q.id, q]));
  const result = new Map<string, VerifiedActivity>();
  for (const p of participations) {
    if (
      p.status !== "completed" ||
      p.applicationStatus === "rejected" ||
      !p.confirmedAt
    )
      continue;
    const id = `completion:${p.userId}:${p.questId}`;
    const tx = transactions.find(
      (t) =>
        t.id === id &&
        t.userId === p.userId &&
        t.questId === p.questId &&
        (t.kind === undefined || t.kind === "QUEST_COMPLETION"),
    );
    const quest = byQuest.get(p.questId);
    const time = Date.parse(p.confirmedAt);
    if (
      !tx ||
      !quest ||
      !Number.isFinite(time) ||
      time > now ||
      Date.parse(tx.date) !== time
    )
      continue;
    const hours = Number.parseFloat(quest.duration.replace(",", "."));
    if (!Number.isFinite(hours) || hours < 0) continue;
    if (!result.has(id))
      result.set(id, {
        id,
        participationId: p.id,
        userId: p.userId,
        questId: p.questId,
        occurredAt: p.confirmedAt,
        hours,
      });
  }
  return [...result.values()].sort(
    (a, b) =>
      Date.parse(a.occurredAt) - Date.parse(b.occurredAt) ||
      a.id.localeCompare(b.id),
  );
}
