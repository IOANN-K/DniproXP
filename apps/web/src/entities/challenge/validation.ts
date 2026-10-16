import type { CityChallenge } from "./types";
import type { Quest, Organization, DemoAccount } from "../types";
import {
  METRIC_UNITS,
  type QuestImpactMeasurement,
} from "../verified-activity/types";
export function validateChallenges(
  items: CityChallenge[],
  quests: Quest[],
  organizations: Organization[],
  accounts: DemoAccount[],
  measurements: QuestImpactMeasurement[],
) {
  if (
    new Set(items.map((c) => c.id)).size !== items.length ||
    new Set(items.map((c) => c.slug)).size !== items.length
  )
    throw new Error("Виклики мають повторні ідентифікатори чи адреси.");
  for (const m of measurements) {
    if (
      !m.id.trim() ||
      !["LITTER_KG", "TREES_PLANTED", "HUMANITARIAN_UNITS"].includes(
        m.metric,
      ) ||
      !quests.some((q) => q.id === m.questId) ||
      m.unit !== METRIC_UNITS[m.metric] ||
      !Number.isFinite(m.value) ||
      m.value < 0
    )
      throw new Error("Некоректна демонстраційна метрика квесту.");
  }
  if (
    new Set(measurements.map((m) => m.id)).size !== measurements.length ||
    new Set(measurements.map((m) => `${m.questId}:${m.metric}`)).size !==
      measurements.length
  )
    throw new Error("Метрика квесту дублюється.");
  for (const c of items) {
    if (
      !c.id.trim() ||
      !c.title.trim() ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug) ||
      ![
        "DRAFT",
        "UPCOMING",
        "ACTIVE",
        "COMPLETED",
        "EXPIRED",
        "CANCELLED",
      ].includes(c.status) ||
      !organizations.some((o) => o.id === c.organizationId)
    )
      throw new Error("Некоректний виклик чи організація.");
    if (
      !Number.isFinite(Date.parse(c.startDate)) ||
      !Number.isFinite(Date.parse(c.endDate)) ||
      Date.parse(c.startDate) > Date.parse(c.endDate)
    )
      throw new Error("Некоректний період виклику.");
    if (
      !c.goals.some((g) => !g.isOptional) ||
      new Set(c.goals.map((g) => g.id)).size !== c.goals.length ||
      new Set(c.goals.map((g) => g.metric)).size !== c.goals.length
    )
      throw new Error("Потрібні унікальні цілі й принаймні одна обов’язкова.");
    for (const g of c.goals)
      if (
        !g.id.trim() ||
        !Object.hasOwn(METRIC_UNITS, g.metric) ||
        !Number.isFinite(g.targetValue) ||
        g.targetValue <= 0 ||
        g.unit !== METRIC_UNITS[g.metric]
      )
        throw new Error("Мета має бути додатною та мати відповідну одиницю.");
    if (
      new Set(c.relatedQuestIds).size !== c.relatedQuestIds.length ||
      c.relatedQuestIds.some((id) => !quests.some((q) => q.id === id))
    )
      throw new Error("Пов’язані квести виклику некоректні.");
    if (
      c.participantIds.some(
        (id) => !accounts.some((a) => a.id === id && a.role === "VOLUNTEER"),
      )
    )
      throw new Error("Невідомий учасник виклику.");
    for (const value of [c.rewards.xp, c.rewards.rewardPoints])
      if (!Number.isFinite(value) || value < 0)
        throw new Error("Нагорода не може бути від’ємною.");
  }
}
