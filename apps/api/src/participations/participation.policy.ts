import {
  ApplicationStatus,
  ParticipationStatus,
  ReportStatus,
} from '../quests/domain.js';
import { conflict } from '../quests/quest.policy.js';
export const applicationTransitions: Readonly<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
> = {
  pending: [
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  approved: [ApplicationStatus.WITHDRAWN],
  rejected: [],
  withdrawn: [ApplicationStatus.PENDING],
};
export const participationTransitions: Readonly<
  Record<ParticipationStatus, readonly ParticipationStatus[]>
> = {
  planned: [
    ParticipationStatus.ACTIVE,
    ParticipationStatus.PENDING,
    ParticipationStatus.CANCELLED,
  ],
  active: [ParticipationStatus.PENDING, ParticipationStatus.CANCELLED],
  pending: [
    ParticipationStatus.ACTIVE,
    ParticipationStatus.COMPLETED,
    ParticipationStatus.CANCELLED,
  ],
  completed: [],
  cancelled: [ParticipationStatus.PLANNED, ParticipationStatus.ACTIVE],
};
export const reportTransitions: Readonly<
  Record<ReportStatus, readonly ReportStatus[]>
> = {
  submitted: [ReportStatus.APPROVED, ReportStatus.REJECTED],
  approved: [],
  rejected: [],
};
export function applicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): void {
  if (!applicationTransitions[from].includes(to))
    conflict('Недопустимий перехід стану заявки.');
}
export function participationTransition(
  from: ParticipationStatus,
  to: ParticipationStatus,
): void {
  if (!participationTransitions[from].includes(to))
    conflict('Недопустимий перехід стану участі.');
}
export function reportTransition(from: ReportStatus, to: ReportStatus): void {
  if (!reportTransitions[from].includes(to))
    conflict('Розглянутий звіт незмінний.');
}
