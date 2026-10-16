import type { Participation } from "../types";
export const participationLabels: Record<Participation["status"], string> = {
  planned: "Заплановано",
  active: "Активний квест",
  pending: "Очікує підтвердження",
  completed: "Завершено",
  cancelled: "Скасовано",
};
