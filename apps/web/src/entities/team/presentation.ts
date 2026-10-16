import type {
  TeamRole,
  TeamQuestStatus,
  TeamInvitation,
  TeamMembership,
} from "./types";
export const teamRoleLabels: Record<TeamRole, string> = {
  OWNER: "Власник",
  MANAGER: "Координатор",
  MEMBER: "Учасник",
};
export const teamQuestLabels: Record<TeamQuestStatus, string> = {
  PENDING: "Очікує схвалення",
  APPROVED: "Участь схвалено",
  IN_PROGRESS: "У роботі",
  PARTIAL: "Частково підтверджено",
  COMPLETED: "Підтверджено",
  REJECTED: "Заявки відхилено",
  CANCELLED: "Участь скасована",
};
export const invitationLabels: Record<TeamInvitation["status"], string> = {
  PENDING: "Очікує відповіді",
  ACCEPTED: "Прийнято",
  DECLINED: "Відхилено",
  EXPIRED: "Термін минув",
  REVOKED: "Відкликано",
};
export const membershipLabels: Record<TeamMembership["status"], string> = {
  ACTIVE: "У команді",
  LEFT: "Вийшов із команди",
  REMOVED: "Членство завершене",
};
