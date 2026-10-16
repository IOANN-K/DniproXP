import type { CityChallengeStatus } from "./types";

export const quantity = (value: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(value);
export const challengeStatusLabels: Record<CityChallengeStatus, string> = {
  DRAFT: "Чернетка",
  UPCOMING: "Незабаром",
  ACTIVE: "Діємо разом",
  COMPLETED: "Спільна мета досягнута",
  EXPIRED: "Період завершено",
  CANCELLED: "Виклик скасовано",
};
