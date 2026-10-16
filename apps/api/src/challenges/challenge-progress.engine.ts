import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { ChallengeDefinition, ChallengeMilestoneCompletion } from '../progress/definition.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { rows, numeric, text, flag } from '../progress/sql.js';
import { DomainError } from '../common/http.js';
import type { ChallengeProgressDto, LeaderboardQueryDto, LeaderboardDto } from '../progress/progress.dto.js';

@Injectable()
export class ChallengeProgressEngine {
  constructor(private readonly source: DataSource, private readonly audit: AuditService) {}

  /** Fixed query count for a page or a reconciliation batch, independent of definition count. */
  async batch(manager: EntityManager, definitions: ChallengeDefinition[], now = Date.now()): Promise<Map<string, ChallengeProgressDto>> {
    if (!definitions.length) return new Map();
    const ids = definitions.map(d => d.id);
    const projected = rows(await manager.query(`
      SELECT d.id AS challenge_id,goal->>'id' AS id,sum(contribution.value)::text AS actual,
        COALESCE(sum(contribution.value)>=(goal->>'targetValue')::numeric,false) AS complete,
        CASE WHEN sum(contribution.value) IS NULL THEN 0
          ELSE LEAST(100,sum(contribution.value)/(goal->>'targetValue')::numeric*100) END::text AS percentage
      FROM challenge_definitions d CROSS JOIN LATERAL jsonb_array_elements(d.rules->'goals') goal
      LEFT JOIN challenge_contributions contribution ON contribution.challenge_id=d.id AND contribution.goal_id=(goal->>'id')::uuid
      WHERE d.id=ANY($1::uuid[]) GROUP BY d.id,goal
    `, [ids]));
    const totals = rows(await manager.query(`
      WITH activity AS (
        SELECT challenge_id,count(DISTINCT participant_user_id) AS contributors,sum(verified_minutes) AS minutes
        FROM challenge_eligible_activities WHERE challenge_id=ANY($1::uuid[]) GROUP BY challenge_id
      ), participants AS (
        SELECT challenge_id,count(*) AS count FROM (
          SELECT challenge_id,user_id FROM challenge_participants WHERE challenge_id=ANY($1::uuid[])
          UNION SELECT challenge_id,participant_user_id FROM challenge_eligible_activities WHERE challenge_id=ANY($1::uuid[])
        ) joined GROUP BY challenge_id
      )
      SELECT d.id,COALESCE(a.contributors,0)::text AS contributors,a.minutes::text AS minutes,COALESCE(p.count,0)::text AS participants
      FROM challenge_definitions d LEFT JOIN activity a ON a.challenge_id=d.id
      LEFT JOIN participants p ON p.challenge_id=d.id WHERE d.id=ANY($1::uuid[])
    `, [ids]));
    const milestones = await manager.createQueryBuilder(ChallengeMilestoneCompletion, 'm').where('m.challengeId IN (:...ids)', { ids }).getMany();
    return new Map(definitions.map((definition): [string, ChallengeProgressDto] => {
      const total = totals.find(row => row.id === definition.id);
      if (!total) throw new Error('Missing totals');
      const goals = definition.rules.goals.map(goal => {
        const row = projected.find(r => r.challenge_id === definition.id && r.id === goal.id);
        return { ...goal, actualValue: !row || row.actual === null ? null : numeric(row.actual), percentage: row ? numeric(row.percentage) : 0, complete: row ? flag(row.complete) : false };
      });
      const required = goals.filter(g => !g.isOptional);
      const complete = required.length > 0 && required.every(g => g.complete) && !['DRAFT', 'CANCELLED'].includes(definition.status);
      const percentage = required.length ? Math.min(...required.map(g => g.percentage)) : 0;
      const status = ['DRAFT', 'CANCELLED'].includes(definition.status) ? definition.status : complete ? 'COMPLETED' :
        definition.startsAt && now < definition.startsAt.getTime() ? 'UPCOMING' :
          definition.endsAt && now > definition.endsAt.getTime() ? 'EXPIRED' : 'ACTIVE';
      return [definition.id, {
        challengeId: definition.id, status, complete, percentage, goals,
        contributorCount: numeric(total.contributors), participantCount: numeric(total.participants),
        hours: total.minutes === null ? null : numeric(total.minutes) / 60,
        milestones: [...definition.rules.milestones].sort((a, b) => a - b).map(threshold => ({
          threshold, currentlyMet: percentage >= threshold,
          reachedAt: milestones.find(m => m.challengeId === definition.id && m.threshold === threshold)?.reachedAt.toISOString() ?? null,
        })),
      }];
    }));
  }

  async calculate(manager: EntityManager, definition: ChallengeDefinition): Promise<ChallengeProgressDto> {
    const result = (await this.batch(manager, [definition])).get(definition.id);
    if (!result) throw new Error('Missing challenge projection');
    return result;
  }

  async reconcileAll(manager: EntityManager): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Milestones require an active transaction');
    // Stable lock order shared by verification, measurements and bonus claims.
    const definitions = await manager.createQueryBuilder(ChallengeDefinition, 'c')
      .where("c.status NOT IN ('DRAFT','CANCELLED')").orderBy('c.id', 'ASC').setLock('for_no_key_update').getMany();
    const projections = await this.batch(manager, definitions);
    const pending = definitions.flatMap(definition => {
      const progress = projections.get(definition.id);
      return progress?.milestones.filter(m => m.currentlyMet && !m.reachedAt)
        .map(m => ({ challengeId: definition.id, threshold: m.threshold })) ?? [];
    });
    if (!pending.length) return;
    // Persist immutable source UUIDs, not IDs of a view whose current measurements can change.
    const evidence = rows(await manager.query(`
      SELECT challenge_id,verified_activity_id AS id FROM challenge_contributions WHERE challenge_id=ANY($1::uuid[])
      UNION SELECT challenge_id,measurement_id FROM challenge_contributions
        WHERE challenge_id=ANY($1::uuid[]) AND measurement_id IS NOT NULL
    `, [[...new Set(pending.map(m => m.challengeId))]]));
    for (const threshold of pending) {
      const milestone = await manager.save(ChallengeMilestoneCompletion, manager.create(ChallengeMilestoneCompletion, {
        ...threshold, evidenceIds: evidence.filter(row => row.challenge_id === threshold.challengeId).map(row => text(row.id)).sort(),
      }));
      await this.audit.record(manager, null, 'CHALLENGE_MILESTONE_REACHED', 'challenge_milestone', milestone.id, { challengeId: threshold.challengeId, threshold: threshold.threshold });
    }
  }

  progress(id: string): Promise<ChallengeProgressDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const definition = await manager.findOneBy(ChallengeDefinition, { id });
      if (!definition || definition.status === 'DRAFT') throw new DomainError(404, 'NOT_FOUND', 'Виклик не знайдено.');
      return this.calculate(manager, definition);
    });
  }

  async ownContribution(manager: EntityManager, id: string, userId: string): Promise<{ ownHours: number; ownQuests: number }> {
    const row = rows(await manager.query(`
      SELECT COALESCE(sum(verified_minutes),0)::text AS minutes,count(DISTINCT quest_id)::text AS quests
      FROM challenge_eligible_activities WHERE challenge_id=$1 AND participant_user_id=$2
    `, [id, userId]))[0];
    if (!row) throw new Error('Missing contribution');
    return { ownHours: numeric(row.minutes) / 60, ownQuests: numeric(row.quests) };
  }

  leaderboard(id: string, input: LeaderboardQueryDto): Promise<LeaderboardDto> {
    return this.source.transaction('REPEATABLE READ', async manager => {
      const definition = await manager.findOneBy(ChallengeDefinition, { id });
      if (!definition || definition.status === 'DRAFT') throw new DomainError(404, 'NOT_FOUND', 'Виклик не знайдено.');
      const visible = `FROM challenge_eligible_activities e JOIN users u ON u.id=e.participant_user_id
        JOIN user_preferences p ON p.user_id=u.id WHERE e.challenge_id=$1 AND u.status='ACTIVE'
        AND p.public_profile AND p.show_display_name AND p.show_activity_history AND p.show_verified_hours`;
      const result = rows(await manager.query(`
        WITH ranked AS (
          SELECT e.participant_user_id AS user_id,sum(e.verified_minutes) AS minutes,count(DISTINCT e.quest_id) AS quests,u.display_name,u.avatar_url
          ${visible} GROUP BY e.participant_user_id,u.display_name,u.avatar_url
        ), numbered AS (
          SELECT *,row_number() OVER(ORDER BY minutes DESC,quests DESC,user_id ASC) AS rank FROM ranked
        ) SELECT *,count(*) OVER()::text AS total FROM numbered ORDER BY rank LIMIT $2 OFFSET $3
      `, [id, input.pageSize, (input.page - 1) * input.pageSize]));
      const total = result[0] ? numeric(result[0].total) : numeric(rows(await manager.query(`
        SELECT count(*)::text AS total FROM (SELECT DISTINCT e.participant_user_id ${visible}) profiles
      `, [id]))[0]?.total);
      return {
        items: result.map(row => ({ userId: text(row.user_id), displayName: text(row.display_name), avatarUrl: row.avatar_url === null ? null : text(row.avatar_url), hours: numeric(row.minutes) / 60, quests: numeric(row.quests), rank: numeric(row.rank) })),
        total, page: input.page, pageSize: input.pageSize,
      };
    });
  }
}
