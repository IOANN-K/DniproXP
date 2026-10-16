import type { Quest, Participation } from "../types";
import type { VerifiedActivity } from "../verified-activity/types";
import type { SkillDefinition, SkillProgress, SkillLevel } from "./types";
import { assertAcyclic } from "../mission/validation";
export function calculateSkills(
  definitions: SkillDefinition[],
  userId: string,
  activities: VerifiedActivity[],
  quests: Quest[],
  participations: Participation[],
): SkillProgress[] {
  assertAcyclic(
    definitions.map((d) => ({
      id: d.id,
      dependencies: d.prerequisiteSkillIds,
    })),
    "Навички",
  );
  for (const d of definitions) {
    if (
      d.levelThresholds.length !== 5 ||
      d.levelThresholds[0] !== 0 ||
      d.levelThresholds.some(
        (n, index) =>
          !Number.isFinite(n) ||
          n < 0 ||
          (index > 0 && n <= d.levelThresholds[index - 1]),
      ) ||
      [d.experienceRules.baseXp, d.experienceRules.xpPerHour].some(
        (n) => !Number.isFinite(n) || n < 0,
      )
    )
      throw new Error("Некоректні пороги або правила навички.");
    if (
      d.prerequisites.length !== d.prerequisiteSkillIds.length ||
      d.prerequisites.some(
        (p) =>
          !d.prerequisiteSkillIds.includes(p.skillId) ||
          !Number.isInteger(p.minLevel) ||
          p.minLevel < 1 ||
          p.minLevel > 4,
      )
    )
      throw new Error("Некоректні передумови навички.");
  }
  const results = new Map<string, SkillProgress>();
  const calculate = (d: SkillDefinition): SkillProgress => {
    const cached = results.get(d.id);
    if (cached) return cached;
    const lockReasons = d.prerequisites.flatMap((p) => {
      const prior = definitions.find((s) => s.id === p.skillId);
      return prior && calculate(prior).level >= p.minLevel
        ? []
        : [
            `Потрібна навичка «${prior?.name || p.skillId}», рівень ${p.minLevel}.`,
          ];
    });
    const unique = [
      ...new Map(
        activities.filter((a) => a.userId === userId).map((a) => [a.id, a]),
      ).values(),
    ];
    const evidence = unique.flatMap((a) => {
      const q = quests.find((q) => q.id === a.questId);
      const p = participations.find((p) => p.id === a.participationId);
      if (
        !q ||
        !d.eligibleQuestCategories.includes(q.categoryId) ||
        (d.experienceRules.requiresTeam && !p?.teamParticipationId)
      )
        return [];
      return [
        {
          id: `skill:${d.id}:${a.id}`,
          skillId: d.id,
          sourceActivityId: a.id,
          questId: q.id,
          questTitle: q.title,
          earnedXp:
            d.experienceRules.baseXp + a.hours * d.experienceRules.xpPerHour,
          hours: a.hours,
          confirmedAt: a.occurredAt,
        },
      ];
    });
    const earnedXp = evidence.reduce((n, e) => n + e.earnedXp, 0);
    const unlocked = lockReasons.length === 0;
    let level: SkillLevel = 0;
    for (const candidate of [1, 2, 3, 4] as const)
      if (unlocked && earnedXp >= d.levelThresholds[candidate])
        level = candidate;
    const nextLevelXp = level === 4 ? null : d.levelThresholds[level + 1];
    const start = d.levelThresholds[level];
    const percentage = !unlocked
      ? 0
      : nextLevelXp === null
        ? 100
        : Math.min(
            100,
            Math.max(0, ((earnedXp - start) / (nextLevelXp - start)) * 100),
          );
    const result = {
      skillId: d.id,
      userId,
      earnedXp,
      level,
      unlocked,
      percentage,
      nextLevelXp,
      evidence,
      lockReasons,
    };
    results.set(d.id, result);
    return result;
  };
  return definitions.map(calculate);
}
export function recommendedSkillQuests(
  definition: SkillDefinition,
  quests: Quest[],
  participations: Participation[],
  userId: string,
) {
  return quests
    .filter(
      (q) =>
        definition.eligibleQuestCategories.includes(q.categoryId) &&
        q.status === "available" &&
        q.participants < q.capacity &&
        ["published", "active"].includes(q.lifecycle || "") &&
        q.moderation === "approved" &&
        (!definition.experienceRules.requiresTeam ||
          q.allowTeamParticipation) &&
        !participations.some(
          (p) =>
            p.userId === userId &&
            p.questId === q.id &&
            (p.status !== "cancelled" || p.applicationStatus === "rejected"),
        ),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
}
