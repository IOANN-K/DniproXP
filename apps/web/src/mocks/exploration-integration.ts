import type { VolunteerState } from "../entities/types";
import type { ExplorationState } from "../entities/exploration-types";
import { verifiedActivities } from "../entities/verified-activity/adapter";
import { validateMissions } from "../entities/mission/validation";
import { validateChallenges } from "../entities/challenge/validation";
import { challengeContributions } from "../entities/challenge/progress";
import { explorationSeed } from "./exploration-data";
export function validateExploration(s: VolunteerState, epic: ExplorationState) {
  if (
    epic.schemaVersion !== 1 ||
    !Array.isArray(epic.missions) ||
    !Array.isArray(epic.challenges) ||
    !Array.isArray(epic.measurements) ||
    !Array.isArray(epic.missionEnrollments) ||
    !Array.isArray(epic.challengeParticipants)
  )
    throw new Error("Непідтримувана версія або структура каталогу історій.");
  if (
    new Set(epic.missionEnrollments.map((e) => `${e.chainId}:${e.userId}`))
      .size !== epic.missionEnrollments.length ||
    new Set(
      epic.challengeParticipants.map((e) => `${e.challengeId}:${e.userId}`),
    ).size !== epic.challengeParticipants.length
  )
    throw new Error("Повторні записи учасників історій.");
  const badges = [
    ...epic.missions.map((m) => m.rewards.achievement),
    ...epic.challenges.map((c) => c.rewards.achievement),
  ];
  if (
    badges.some((b) => !b.id?.trim() || !b.title?.trim()) ||
    new Set(badges.map((b) => b.id)).size !== badges.length
  )
    throw new Error("Відзнаки повинні мати унікальні ідентифікатори та назви.");
  validateMissions(epic.missions, s.questRecords, s.organizations);
  validateChallenges(
    epic.challenges,
    s.questRecords,
    s.organizations,
    s.accounts,
    epic.measurements,
  );
  for (const e of epic.missionEnrollments)
    if (
      !epic.missions.some((m) => m.id === e.chainId) ||
      !s.accounts.some((a) => a.id === e.userId && a.role === "VOLUNTEER")
    )
      throw new Error("Некоректний запис на місію.");
  for (const e of epic.challengeParticipants)
    if (
      !epic.challenges.some((c) => c.id === e.challengeId) ||
      !s.accounts.some((a) => a.id === e.userId && a.role === "VOLUNTEER")
    )
      throw new Error("Некоректний учасник виклику.");
}
export function initializeExploration(s: VolunteerState) {
  if (!s.exploration) {
    s.exploration = explorationSeed(s.questRecords);
  }
  try {
    validateExploration(s, s.exploration);
  } catch (error) {
    const rejected = s.exploration;
    s.exploration = explorationSeed(s.questRecords);
    s.exploration.recoveryMessage = `Некоректний збережений каталог відхилено. ${error instanceof Error ? error.message : "Відновлено демонстраційні визначення."}`;
    s.explorationRejectedSnapshot = rejected;
    validateExploration(s, s.exploration);
  }
  reconcileExploration(s);
}
export function reconcileExploration(s: VolunteerState) {
  const epic = s.exploration;
  if (!epic) return;
  validateExploration(s, epic);
  const verified = verifiedActivities(
    s.participations,
    s.transactions,
    s.questRecords,
    s.clock,
  );
  // Rebuild by stable source IDs instead of incrementing totals on repeated callbacks.
  epic.contributions = epic.challenges.flatMap((c) =>
    challengeContributions(c, verified, epic.measurements),
  );
}
