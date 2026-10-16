import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { Organization } from '../database/entities/organization.entity.js';
import { ModerationStatus, UserStatus } from '../database/entities/domain.js';
import { User } from '../database/entities/user.entity.js';
import { DomainError } from '../common/http.js';
import { Quest } from './quest.entity.js';
import {
  ApplicationStatus,
  ParticipationStatus,
  QuestLifecycle,
  QuestModeration,
} from './domain.js';
export function conflict(message: string, code = 'INVALID_TRANSITION'): never {
  throw new DomainError(409, code, message);
}
export const openLifecycles: QuestLifecycle[] = [
  QuestLifecycle.PUBLISHED,
  QuestLifecycle.ACTIVE,
];
export const transitions: Readonly<
  Record<QuestLifecycle, readonly QuestLifecycle[]>
> = {
  draft: [QuestLifecycle.PUBLISHED, QuestLifecycle.CANCELLED],
  published: [QuestLifecycle.ACTIVE, QuestLifecycle.CANCELLED],
  active: [QuestLifecycle.COMPLETED, QuestLifecycle.CANCELLED],
  completed: [QuestLifecycle.ARCHIVED],
  cancelled: [QuestLifecycle.ARCHIVED],
  archived: [],
};
export function assertTransition(quest: Quest, next: QuestLifecycle): void {
  if (!transitions[quest.lifecycle].includes(next))
    conflict('Недопустимий перехід стану квесту.');
}
export function assertPublication(quest: Quest, future: boolean): void {
  if (
    quest.title.length < 8 ||
    quest.description.length < 20 ||
    quest.fullDescription.length < 60 ||
    quest.district.length < 3 ||
    quest.address.length < 5 ||
    quest.instructions.length < 20 ||
    !quest.image ||
    quest.imageAlt.length < 3 ||
    !quest.startAt ||
    !quest.endAt
  )
    conflict(
      'Заповни всі умови квесту перед модерацією та публікацією.',
      'QUEST_INCOMPLETE',
    );
  if (future && quest.startAt.getTime() <= Date.now())
    conflict('Обери майбутній час початку.', 'QUEST_DATE_PASSED');
}
export function assertConfiguration(quest: Quest): void {
  const invalid = (field: string, message: string): never => {
    throw new DomainError(422, 'VALIDATION_FAILED', message, {
      fields: { [field]: [message] },
    });
  };
  if (quest.requirements.join('\n').length > 2000)
    invalid(
      'requirements',
      'Вимоги мають містити не більше 2000 символів загалом.',
    );
  if (quest.bring.join('\n').length > 2000)
    invalid(
      'bring',
      'Перелік речей має містити не більше 2000 символів загалом.',
    );
  if ((quest.startAt === null) !== (quest.endAt === null))
    invalid('endAt', 'Вкажи початок і завершення разом.');
  if (quest.startAt && quest.endAt) {
    const minutes = (quest.endAt.getTime() - quest.startAt.getTime()) / 60000;
    if (!Number.isFinite(minutes) || minutes < 30 || minutes > 720)
      invalid('endAt', 'Тривалість має становити від 30 хвилин до 12 годин.');
  }
  if (
    quest.allowTeamParticipation &&
    (quest.teamParticipantLimit === null ||
      quest.teamParticipantLimit < 1 ||
      quest.teamParticipantLimit > Math.min(50, quest.capacity))
  )
    invalid(
      'teamParticipantLimit',
      'Ліміт команди має відповідати місткості квесту.',
    );
  if (!quest.allowTeamParticipation) quest.teamParticipantLimit = null;
}
// SQL counts pending reservations exactly once, and approved seats only while participation is not cancelled.
export const occupiedSql = `(SELECT COUNT(*)::integer FROM quest_applications seat LEFT JOIN participations sp ON sp.application_id=seat.id WHERE seat.quest_id=q.id AND (seat.status='pending' OR (seat.status='approved' AND sp.status <> 'cancelled')))`;
export async function occupied(
  manager: EntityManager,
  questId: string,
): Promise<number> {
  return manager
    .createQueryBuilder('quest_applications', 'a')
    .leftJoin('participations', 'p', 'p.application_id=a.id')
    .where('a.quest_id=:questId', { questId })
    .andWhere(
      '(a.status=:pending OR (a.status=:approved AND p.status<>:cancelled))',
      {
        pending: ApplicationStatus.PENDING,
        approved: ApplicationStatus.APPROVED,
        cancelled: ParticipationStatus.CANCELLED,
      },
    )
    .getCount();
}
@Injectable()
export class QuestPolicy {
  constructor(private readonly access: OrganizationAccess) {}
  async lock(
    manager: EntityManager,
    id: string,
    actorId?: string,
    capability: 'manage' | 'verify' | 'publish' = 'manage',
  ): Promise<{ quest: Quest; organization: Organization }> {
    const reference = await manager.findOneBy(Quest, { id });
    if (!reference)
      throw new DomainError(404, 'NOT_FOUND', 'Квест не знайдено.');
    const organization = actorId
      ? await this.access.requireCapability(
          manager,
          reference.organizationId,
          actorId,
          capability,
        )
      : await manager.findOne(Organization, {
          where: { id: reference.organizationId },
          lock: { mode: 'pessimistic_write' },
        });
    const quest = await manager.findOne(Quest, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!quest || !organization)
      throw new DomainError(404, 'NOT_FOUND', 'Квест не знайдено.');
    return { quest, organization };
  }
  async activeUser(manager: EntityManager, id: string): Promise<User> {
    const user = await manager.findOneBy(User, {
      id,
      status: UserStatus.ACTIVE,
    });
    if (!user)
      throw new DomainError(403, 'FORBIDDEN', 'Обліковий запис недоступний.');
    return user;
  }
  available(quest: Quest, organization: Organization): void {
    if (
      !openLifecycles.includes(quest.lifecycle) ||
      quest.moderation !== QuestModeration.APPROVED ||
      organization.moderationStatus !== ModerationStatus.APPROVED ||
      !quest.endAt ||
      quest.endAt.getTime() <= Date.now()
    )
      conflict(
        'Запис або розгляд заявки зараз недоступний.',
        'QUEST_UNAVAILABLE',
      );
  }
}
