import type { QuestChainStatus } from "./types";

export const missionLifecycleLabels: Record<QuestChainStatus, string> = {
  DRAFT: "Чернетка",
  PUBLISHED: "Відкрита місія",
  ACTIVE: "Історія триває",
  COMPLETED: "Ініціативу завершено",
  ARCHIVED: "Архівна історія",
};
