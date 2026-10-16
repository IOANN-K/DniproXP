export type VerifiedActivity = {
  id: string;
  participationId: string;
  userId: string;
  questId: string;
  occurredAt: string;
  hours: number;
};
export type ImpactMetric =
  | "VOLUNTEER_HOURS"
  | "LITTER_KG"
  | "TREES_PLANTED"
  | "HUMANITARIAN_UNITS";
export type ImpactUnit = "год" | "кг" | "дерев" | "од.";
export type QuestImpactMeasurement = {
  id: string;
  questId: string;
  metric: Exclude<ImpactMetric, "VOLUNTEER_HOURS">;
  value: number;
  unit: ImpactUnit;
};
export const METRIC_UNITS: Record<ImpactMetric, ImpactUnit> = {
  VOLUNTEER_HOURS: "год",
  LITTER_KG: "кг",
  TREES_PLANTED: "дерев",
  HUMANITARIAN_UNITS: "од.",
};
export const METRIC_LABELS: Record<ImpactMetric, string> = {
  VOLUNTEER_HOURS: "Волонтерські години",
  LITTER_KG: "Зібране сміття",
  TREES_PLANTED: "Висаджені дерева",
  HUMANITARIAN_UNITS: "Гуманітарна допомога",
};
