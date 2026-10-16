import type { QuestChain } from "./types";
import type { Quest, Organization } from "../types";
export function assertAcyclic(
  nodes: { id: string; dependencies: string[] }[],
  label: string,
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (byId.size !== nodes.length)
    throw new Error(`${label}: повторні ідентифікатори.`);
  const active = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) throw new Error(`${label}: циклічні передумови.`);
    if (done.has(id)) return;
    const node = byId.get(id);
    if (!node) throw new Error(`${label}: невідома передумова ${id}.`);
    active.add(id);
    node.dependencies.forEach(visit);
    active.delete(id);
    done.add(id);
  };
  nodes.forEach((n) => visit(n.id));
}
export function validateMissions(
  missions: QuestChain[],
  quests: Quest[],
  organizations: Organization[],
) {
  assertAcyclic(
    missions.map((m) => ({ id: m.id, dependencies: m.prerequisites.chainIds })),
    "Місії",
  );
  if (new Set(missions.map((m) => m.slug)).size !== missions.length)
    throw new Error("Повторні адреси місій.");
  for (const m of missions) {
    if (
      !m.id.trim() ||
      !m.title.trim() ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.slug) ||
      !["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "ARCHIVED"].includes(
        m.status,
      ) ||
      !organizations.some((o) => o.id === m.organizationId)
    )
      throw new Error("Некоректна місія чи організація.");
    if (!m.steps.some((s) => !s.isOptional))
      throw new Error("Місія має містити обов’язковий етап.");
    if (
      !Number.isInteger(m.prerequisites.minLevel) ||
      m.prerequisites.minLevel < 1
    )
      throw new Error("Некоректна вимога рівня.");
    if (m.prerequisites.questIds.some((id) => !quests.some((q) => q.id === id)))
      throw new Error("Невідомий квест у передумовах місії.");
    if (
      new Set(m.steps.map((s) => s.questId)).size !== m.steps.length ||
      new Set(m.steps.map((s) => s.order)).size !== m.steps.length
    )
      throw new Error("Квест або порядок етапу дублюється.");
    assertAcyclic(
      m.steps.map((s) => ({ id: s.id, dependencies: s.prerequisiteStepIds })),
      "Етапи місії",
    );
    for (const s of m.steps) {
      if (
        !s.id.trim() ||
        !s.title.trim() ||
        !Number.isInteger(s.order) ||
        s.order < 1 ||
        s.chainId !== m.id ||
        !quests.some((q) => q.id === s.questId)
      )
        throw new Error("Етап посилається на невідомий квест чи місію.");
      if (
        !s.isOptional &&
        s.prerequisiteStepIds.some(
          (id) => m.steps.find((p) => p.id === id)?.isOptional,
        )
      )
        throw new Error("Необов’язковий етап не може блокувати основну місію.");
    }
    for (const value of [m.rewards.xp, m.rewards.rewardPoints])
      if (!Number.isFinite(value) || value < 0)
        throw new Error("Нагорода місії не може бути від’ємною.");
    if (
      (m.startsAt && !Number.isFinite(Date.parse(m.startsAt))) ||
      (m.endsAt && !Number.isFinite(Date.parse(m.endsAt))) ||
      (m.startsAt && m.endsAt && Date.parse(m.startsAt) > Date.parse(m.endsAt))
    )
      throw new Error("Некоректний період місії.");
  }
}
