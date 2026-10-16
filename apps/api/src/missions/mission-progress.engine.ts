import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { MissionDefinition, MissionEnrollment, MissionCompletion, ProgressRewardClaim } from '../progress/definition.entity.js';
import { User } from '../database/entities/user.entity.js';
import { VerifiedActivity } from '../ledger/ledger.entity.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { AuditService } from '../audit/audit.service.js';
import { occupiedSql } from '../quests/quest.policy.js';
import { rows, text } from '../progress/sql.js';
import type { MissionProgressDto, MissionStepProgressDto } from '../progress/progress.dto.js';
import { DomainError } from '../common/http.js';

type QuestFact = { id: string; available: boolean };
export type MissionContext = {
  definitions: MissionDefinition[];
  activities: VerifiedActivity[];
  enrolled: Set<string>;
  claimed: Set<string>;
  active: Set<string>;
  quests: Map<string, QuestFact>;
  level: number;
  now: number;
};

@Injectable()
export class MissionProgressEngine {
  constructor(
    private readonly source: DataSource,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async context(manager: EntityManager, userId: string, now = Date.now()): Promise<MissionContext> {
    const definitions = await manager.find(MissionDefinition, { order: { id: 'ASC' } });
    const activities = await manager.find(VerifiedActivity, { where: { userId }, order: { verifiedAt: 'ASC', id: 'ASC' } });
    const enrollments = await manager.find(MissionEnrollment, { where: { userId } });
    const claims = await manager.find(ProgressRewardClaim, { where: { userId, kind: 'mission' } });
    const participation = rows(await manager.query(`
      SELECT a.quest_id FROM quest_applications a LEFT JOIN participations p ON p.application_id=a.id
      WHERE a.user_id=$1 AND (a.status='pending' OR (a.status='approved' AND p.status IN ('planned','active','pending')))
    `, [userId]));
    const questIds = [...new Set(definitions.flatMap(d => d.rules.steps.map(s => s.questId)))];
    const facts = questIds.length ? rows(await manager.query(`
      SELECT q.id,(q.lifecycle IN ('published','active') AND q.moderation='approved'
        AND org.moderation_status='approved' AND q.end_at>$2::timestamptz
        AND ${occupiedSql}<q.capacity) AS available
      FROM quests q JOIN organizations org ON org.id=q.organization_id WHERE q.id=ANY($1::uuid[])
    `, [questIds, new Date(now)])) : [];
    return {
      definitions, activities, now,
      enrolled: new Set(enrollments.map(e => e.missionId)),
      claimed: new Set(claims.map(c => c.definitionId)),
      active: new Set(participation.map(row => text(row.quest_id))),
      quests: new Map(facts.map((row): [string, QuestFact] => {
        const id = text(row.id);
        return [id, { id, available: row.available === true }];
      })),
      level: (await this.ledger.readProgression(manager, userId)).currentLevel,
    };
  }

  calculate(
    definition: MissionDefinition,
    userId: string,
    context: MissionContext,
    memo = new Map<string, MissionProgressDto>(),
    trail = new Set<string>(),
  ): MissionProgressDto {
    const cached = memo.get(definition.id);
    if (cached) return cached;
    if (trail.has(definition.id))
      throw new DomainError(409, 'MISSION_GRAPH_INVALID', 'Цикл передумов місії.');
    const path = new Set(trail).add(definition.id), rules = definition.rules;
    const reasons: string[] = [];
    if (context.level < rules.prerequisites.minLevel)
      reasons.push(`Потрібен рівень ${rules.prerequisites.minLevel}.`);
    for (const id of rules.prerequisites.questIds) {
      if (!context.activities.some(a => a.questId === id))
        reasons.push('Спочатку підтвердь виконання квесту-передумови.');
    }
    for (const id of rules.prerequisites.chainIds) {
      const other = context.definitions.find(d => d.id === id);
      if (!other || this.calculate(other, userId, context, memo, path).status !== 'COMPLETED')
        reasons.push(`Спочатку заверши місію «${other?.title ?? id}».`);
    }
    const eligible = context.activities.filter(a =>
      (!definition.startsAt || a.verifiedAt >= definition.startsAt) &&
      (!definition.endsAt || a.verifiedAt <= definition.endsAt),
    );
    const confirmed = new Map(eligible.map(a => [a.questId, a]));
    const required = rules.steps.filter(s => !s.isOptional), optional = rules.steps.filter(s => s.isOptional);
    const requiredCompleted = required.filter(s => confirmed.has(s.questId)).length;
    const optionalCompleted = optional.filter(s => confirmed.has(s.questId)).length;
    const completed = required.length > 0 && requiredCompleted === required.length && !reasons.length && definition.status !== 'DRAFT';
    const open = ['PUBLISHED', 'ACTIVE'].includes(definition.status) &&
      (!definition.startsAt || context.now >= definition.startsAt.getTime()) &&
      (!definition.endsAt || context.now <= definition.endsAt.getTime());
    if (!open && !completed) {
      reasons.push(definition.status === 'DRAFT' ? 'Місію ще не опубліковано.' :
        definition.startsAt && context.now < definition.startsAt.getTime() ? 'Місія ще не почалася.' :
          'Проходження цієї місії вже закрито.');
    }
    const steps = rules.steps.slice().sort((a, b) => a.order - b.order).map((step): MissionStepProgressDto => {
      const activity = confirmed.get(step.questId);
      // A historical verified contribution is retained even when a later dependency is closed.
      if (activity) return { stepId: step.id, status: 'COMPLETED', confirmedAt: activity.verifiedAt.toISOString(), reason: null };
      const dependenciesMet = step.prerequisiteStepIds.every(id => {
        const prior = rules.steps.find(s => s.id === id);
        return !!prior && confirmed.has(prior.questId);
      });
      if (reasons.length || !dependenciesMet || !open)
        return { stepId: step.id, status: 'LOCKED', confirmedAt: null, reason: reasons[0] ?? (!open ? 'Нові етапи цієї місії вже закриті.' : 'Потрібне підтвердження попереднього етапу.') };
      const active = context.active.has(step.questId);
      if (!active && !context.quests.get(step.questId)?.available)
        return { stepId: step.id, status: 'LOCKED', confirmedAt: null, reason: 'Квест цього етапу зараз недоступний для нової участі.' };
      return { stepId: step.id, status: active ? 'IN_PROGRESS' : 'AVAILABLE', confirmedAt: null, reason: null };
    });
    const isRequired = (step: MissionStepProgressDto) => !rules.steps.find(s => s.id === step.stepId)?.isOptional;
    const next = steps.find(s => s.status === 'IN_PROGRESS' && isRequired(s)) ??
      steps.find(s => s.status === 'AVAILABLE' && isRequired(s)) ??
      steps.find(s => ['AVAILABLE', 'IN_PROGRESS'].includes(s.status));
    if (!completed && !next && !reasons.length)
      reasons.push('Наразі немає відкритих етапів для продовження цієї історії.');
    const completionTimes = required.flatMap(s => {
      const activity = confirmed.get(s.questId);
      return activity ? [activity.verifiedAt.toISOString()] : [];
    }).sort().reverse();
    const started = requiredCompleted > 0 || optionalCompleted > 0 || context.enrolled.has(definition.id) || steps.some(s => s.status === 'IN_PROGRESS');
    const result: MissionProgressDto = {
      chainId: definition.id, userId, status: completed ? 'COMPLETED' : reasons.length ? 'LOCKED' : started ? 'IN_PROGRESS' : 'AVAILABLE',
      steps, requiredCompleted, requiredTotal: required.length, optionalCompleted, optionalTotal: optional.length,
      percentage: required.length ? requiredCompleted / required.length * 100 : 0,
      nextStepId: completed ? null : next?.stepId ?? null,
      completedAt: completed ? completionTimes[0] ?? null : null,
      rewardClaimed: context.claimed.has(definition.id), reasons, enrolled: context.enrolled.has(definition.id),
    };
    memo.set(definition.id, result);
    return result;
  }

  private evidence(definition: MissionDefinition, context: MissionContext, visited = new Set<string>()): string[] {
    if (visited.has(definition.id)) return [];
    visited.add(definition.id);
    const own = context.activities.filter(activity =>
      definition.rules.prerequisites.questIds.includes(activity.questId) || (
        definition.rules.steps.some(step => !step.isOptional && step.questId === activity.questId) &&
        (!definition.startsAt || activity.verifiedAt >= definition.startsAt) &&
        (!definition.endsAt || activity.verifiedAt <= definition.endsAt)
      ),
    ).map(activity => activity.id);
    const prerequisiteSources = definition.rules.prerequisites.chainIds.flatMap(id => {
      const dependency = context.definitions.find(d => d.id === id);
      return dependency ? this.evidence(dependency, context, visited) : [];
    });
    return [...new Set([...own, ...prerequisiteSources])].sort();
  }

  async reconcileUser(manager: EntityManager, userId: string): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Mission completions require an active transaction');
    const user = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
    if (!user) throw new DomainError(404, 'NOT_FOUND', 'Користувача не знайдено.');
    const context = await this.context(manager, userId);
    const known = new Set((await manager.find(MissionCompletion, { where: { userId } })).map(c => c.missionId));
    const memo = new Map<string, MissionProgressDto>();
    for (const definition of context.definitions) {
      if (known.has(definition.id) || definition.status === 'DRAFT') continue;
      const progress = this.calculate(definition, userId, context, memo);
      if (progress.status !== 'COMPLETED' || !progress.completedAt) continue;
      const evidenceIds = this.evidence(definition, context);
      const completion = await manager.save(MissionCompletion, manager.create(MissionCompletion, {
        userId, missionId: definition.id, completedAt: new Date(progress.completedAt), evidenceIds,
      }));
      await this.audit.record(manager, userId, 'MISSION_COMPLETED', 'mission_completion', completion.id, { missionId: definition.id });
    }
  }

  progress(userId: string, id: string): Promise<MissionProgressDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const context = await this.context(manager, userId);
      const definition = context.definitions.find(d => d.id === id && d.status !== 'DRAFT');
      if (!definition) throw new DomainError(404, 'NOT_FOUND', 'Місію не знайдено.');
      return this.calculate(definition, userId, context);
    });
  }
}
