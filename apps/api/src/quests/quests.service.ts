import type { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { OrganizationMembership } from '../database/entities/organization.entity.js';
import { Role, MembershipStatus } from '../database/entities/domain.js';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import { Quest } from './quest.entity.js';
import {
  QuestApplication,
  Participation,
} from '../participations/participation.entity.js';
import {
  ApplicationStatus,
  ParticipationStatus,
  QuestLifecycle,
  QuestModeration,
} from './domain.js';
import {
  QuestPolicy,
  assertPublication,
  assertTransition,
  conflict,
  occupied,
} from './quest.policy.js';
import { applyQuestInput, managedQuest } from './quest.mapper.js';
import type {
  CreateQuestDto,
  UpdateQuestDto,
  ManagedQuestDto,
} from './quests.dto.js';
@Injectable()
export class QuestsService {
  constructor(
    private readonly transactions: Transactions,
    private readonly access: OrganizationAccess,
    private readonly policy: QuestPolicy,
    private readonly audit: AuditService,
  ) {}
  async create(
    actorId: string,
    input: CreateQuestDto,
  ): Promise<ManagedQuestDto> {
    return this.transactions.run(manager => this.createWithin(manager,actorId,input));
  }
  async createWithin(manager: EntityManager,actorId: string,input: CreateQuestDto): Promise<ManagedQuestDto> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Quest creation requires a transaction');
    const org = await this.access.requireCapability(
      manager,
      input.organizationId,
      actorId,
      'manage',
    );
    const quest = manager.create(Quest, {
      organizationId: org.id,
      title: input.title,
      categoryId: input.categoryId,
      difficulty: input.difficulty,
      capacity: input.capacity,
      xp: input.xp,
      rewardPoints: input.rewardPoints,
      description: '',
      fullDescription: '',
      district: '',
      address: '',
      startAt: null,
      endAt: null,
      latitude: null,
      longitude: null,
      coordinateSource: null,
      locationLabel: null,
      requirements: [],
      bring: [],
      instructions: '',
      image: null,
      imageAlt: input.title,
      lifecycle: QuestLifecycle.DRAFT,
      archivedFrom: null,
      moderation: QuestModeration.PENDING,
      moderationReason: null,
      reviewSubmittedAt: null,
      publishedAt: null,
      allowTeamParticipation: false,
      teamParticipantLimit: null,
    });
    applyQuestInput(quest, input);
    await manager.save(quest);
    await this.audit.record(
      manager,
      actorId,
      'QUEST_CREATED',
      'quest',
      quest.id,
    );
    return managedQuest(quest, 0, org.moderationStatus === 'approved');
  }
  async update(
    actorId: string,
    id: string,
    input: UpdateQuestDto,
  ): Promise<ManagedQuestDto> {
    return this.transactions.run(async (manager) => {
      const { quest, organization } = await this.policy.lock(
        manager,
        id,
        actorId,
      );
      if (
        ![QuestLifecycle.DRAFT, QuestLifecycle.PUBLISHED].includes(
          quest.lifecycle,
        )
      )
        conflict('Умови цього квесту вже зафіксовано.');
      if (await manager.existsBy(QuestApplication, { questId: id }))
        conflict(
          'Після першої заявки умови квесту не редагуються.',
          'QUEST_TERMS_LOCKED',
        );
      applyQuestInput(quest, input);
      if (quest.capacity < (await occupied(manager, id)))
        conflict(
          'Місткість менша за кількість зайнятих місць.',
          'CAPACITY_EXCEEDED',
        );
      quest.lifecycle = QuestLifecycle.DRAFT;
      quest.moderation = QuestModeration.PENDING;
      quest.reviewSubmittedAt = null;
      quest.moderationReason = null;
      await manager.save(quest);
      await this.audit.record(manager, actorId, 'QUEST_UPDATED', 'quest', id);
      return managedQuest(
        quest,
        await occupied(manager, id),
        organization.moderationStatus === 'approved',
      );
    });
  }
  async transition(
    actorId: string,
    id: string,
    action:
      'submit-review' | 'publish' | 'start' | 'complete' | 'cancel' | 'archive',
  ): Promise<ManagedQuestDto> {
    return this.transactions.run(async (manager) => {
      const { quest, organization } = await this.policy.lock(
        manager,
        id,
        actorId,
        action === 'publish' || action === 'submit-review' || action === 'start'
          ? 'publish'
          : 'manage',
      );
      const previous = quest.lifecycle;
      if (action === 'submit-review') {
        if (quest.lifecycle !== QuestLifecycle.DRAFT)
          conflict('На модерацію подається лише чернетка.');
        assertPublication(quest, true);
        quest.moderation = QuestModeration.PENDING;
        quest.moderationReason = null;
        quest.reviewSubmittedAt = new Date();
      } else {
        const next = {
          publish: QuestLifecycle.PUBLISHED,
          start: QuestLifecycle.ACTIVE,
          complete: QuestLifecycle.COMPLETED,
          cancel: QuestLifecycle.CANCELLED,
          archive: QuestLifecycle.ARCHIVED,
        }[action];
        if (quest.lifecycle === next)
          return managedQuest(
            quest,
            await occupied(manager, id),
            organization.moderationStatus === 'approved',
          );
        assertTransition(quest, next);
        if (action === 'publish') {
          assertPublication(quest, true);
          if (quest.moderation !== QuestModeration.APPROVED)
            conflict(
              'Потрібне схвалення адміністратора.',
              'QUEST_NOT_APPROVED',
            );
          quest.publishedAt ??= new Date();
        }
        if (action === 'start') {
          if (!quest.startAt || quest.startAt.getTime() > Date.now())
            conflict('Час початку ще не настав.');
          await manager.update(
            Participation,
            { questId: id, status: ParticipationStatus.PLANNED },
            { status: ParticipationStatus.ACTIVE },
          );
        }
        if (action === 'complete') {
          const pending = await manager.existsBy(QuestApplication, {
            questId: id,
            status: ApplicationStatus.PENDING,
          });
          const unresolved = await manager
            .createQueryBuilder(Participation, 'p')
            .where('p.questId=:id', { id })
            .andWhere('p.status IN (:...states)', {
              states: [
                ParticipationStatus.PLANNED,
                ParticipationStatus.ACTIVE,
                ParticipationStatus.PENDING,
              ],
            })
            .getExists();
          if (pending || unresolved)
            conflict(
              'Спершу врегулюй заявки та участі.',
              'UNRESOLVED_PARTICIPATIONS',
            );
        }
        if (action === 'cancel') {
          await manager.update(
            QuestApplication,
            { questId: id, status: ApplicationStatus.PENDING },
            {
              status: ApplicationStatus.WITHDRAWN,
              reason: 'Квест скасовано організатором.',
            },
          );
          await manager
            .createQueryBuilder()
            .update(Participation)
            .set({ status: ParticipationStatus.CANCELLED })
            .where('quest_id=:id AND status NOT IN (:...states)', {
              id,
              states: [
                ParticipationStatus.COMPLETED,
                ParticipationStatus.CANCELLED,
              ],
            })
            .execute();
        }
        if (action === 'archive') quest.archivedFrom = quest.lifecycle;
        quest.lifecycle = next;
      }
      await manager.save(quest);
      await this.audit.record(
        manager,
        actorId,
        'QUEST_TRANSITION',
        'quest',
        id,
        { action, previous, lifecycle: quest.lifecycle },
      );
      return managedQuest(
        quest,
        await occupied(manager, id),
        organization.moderationStatus === 'approved',
      );
    });
  }
  async moderate(
    actorId: string,
    id: string,
    approve: boolean,
    reason: string | null,
  ): Promise<ManagedQuestDto> {
    return this.transactions.run(async (manager) => {
      const actor = await this.policy.activeUser(manager, actorId);
      if (!actor.roles.includes(Role.ADMIN))
        throw new DomainError(
          403,
          'FORBIDDEN',
          'Потрібні права адміністратора.',
        );
      const { quest, organization } = await this.policy.lock(manager, id);
      if (
        await manager.existsBy(OrganizationMembership, {
          organizationId: quest.organizationId,
          userId: actorId,
          status: MembershipStatus.ACTIVE,
        })
      )
        throw new DomainError(
          403,
          'SELF_MODERATION_FORBIDDEN',
          'Не можна модерувати власну організацію.',
        );
      const target = approve
        ? QuestModeration.APPROVED
        : QuestModeration.REJECTED;
      if (quest.lifecycle !== QuestLifecycle.DRAFT || !quest.reviewSubmittedAt)
        conflict('Квест не перебуває на модерації.');
      if (quest.moderation === target)
        return managedQuest(
          quest,
          await occupied(manager, id),
          organization.moderationStatus === 'approved',
        );
      if (quest.moderation !== QuestModeration.PENDING)
        conflict('Квест уже розглянуто.');
      if (approve) {
        if (organization.moderationStatus !== 'approved')
          conflict('Організацію не схвалено.');
        assertPublication(quest, true);
      }
      quest.moderation = target;
      quest.moderationReason = reason;
      await manager.save(quest);
      await this.audit.record(
        manager,
        actorId,
        'QUEST_MODERATED',
        'quest',
        id,
        { moderation: target, reason },
      );
      return managedQuest(
        quest,
        await occupied(manager, id),
        organization.moderationStatus === 'approved',
      );
    });
  }
}
