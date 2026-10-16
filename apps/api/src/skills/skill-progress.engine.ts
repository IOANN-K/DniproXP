import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { SkillDefinition } from './skill.entity.js';
import type { SkillLevel } from './skill.entity.js';
import { rows,numeric,text,iso } from '../progress/sql.js';
import { DomainError } from '../common/http.js';
import { identityProfile,requireIdentity } from '../identity/privacy.js';
import type { IdentityPageQueryDto,SkillDefinitionDto,SkillDefinitionPageDto,SkillProgressDto,SkillProgressPageDto,PublicSkillPageDto,SkillEvidencePageDto,SkillEvidenceDto } from './skills.dto.js';
export function skillView(row: SkillDefinition): SkillDefinitionDto {
  return { id: row.id,slug: row.slug,name: row.title,title: row.title,description: row.description,category: row.category,icon: row.icon,status: row.status,levelThresholds: row.levelThresholds,eligibleQuestCategories: row.eligibleQuestCategories,prerequisiteSkillIds: row.prerequisites.map(p => p.skillId),prerequisites: row.prerequisites,experienceRules: row.experienceRules };
}
function evidenceView(row: Record<string,unknown>): SkillEvidenceDto {
  return { id: text(row.id),skillId: text(row.skill_id),sourceActivityId: text(row.source_activity_id),questId: text(row.quest_id),questTitle: text(row.title),earnedXp: numeric(row.earned_xp),hours: numeric(row.verified_minutes)/60,confirmedAt: iso(row.confirmed_at) };
}
@Injectable()
export class SkillProgressEngine {
  constructor(private readonly source: DataSource) {}
  async calculate(manager: EntityManager,userId: string): Promise<SkillProgressDto[]> {
    const definitions = await manager.find(SkillDefinition,{ order: { slug: 'ASC' } });
    const totals = rows(await manager.query('SELECT skill_id,sum(earned_xp)::text AS xp,count(*)::text AS count,max(confirmed_at) AS updated FROM user_skill_evidence WHERE user_id=$1 GROUP BY skill_id',[userId]));
    const recent = rows(await manager.query(`SELECT e.*,q.title FROM (SELECT *,row_number() OVER(PARTITION BY skill_id ORDER BY confirmed_at DESC,id DESC) AS position FROM user_skill_evidence WHERE user_id=$1) e JOIN quests q ON q.id=e.quest_id WHERE position<=5 ORDER BY skill_id,confirmed_at DESC,id DESC`,[userId]));
    const results = new Map<string,SkillProgressDto>(), visiting = new Set<string>();
    const calculate = (definition: SkillDefinition): SkillProgressDto => {
      const cached = results.get(definition.id);if (cached) return cached;
      if (visiting.has(definition.id)) throw new DomainError(503,'INVALID_SKILL_GRAPH','Некоректна конфігурація навичок.');visiting.add(definition.id);
      const lockReasons = definition.prerequisites.flatMap(prerequisite => {
        const previous = definitions.find(d => d.id === prerequisite.skillId);
        return previous && calculate(previous).level >= prerequisite.minLevel ? [] : [`Потрібна навичка «${previous?.title ?? prerequisite.skillId}», рівень ${prerequisite.minLevel}.`];
      });
      const total = totals.find(t => t.skill_id === definition.id), earnedXp = total ? numeric(total.xp) : 0, count = total ? numeric(total.count) : 0;
      let level: SkillLevel = 0;for (const candidate of [1,2,3,4] as const) if (!lockReasons.length && earnedXp >= definition.levelThresholds[candidate]) level = candidate;
      const nextLevelXp = level === 4 ? null : definition.levelThresholds[level+1], start = definition.levelThresholds[level];
      const percentage = lockReasons.length ? 0 : nextLevelXp === null ? 100 : Math.min(100,Math.max(0,(earnedXp-start)/(nextLevelXp-start)*100));
      const result: SkillProgressDto = { updatedAt: total?.updated ? iso(total.updated) : null,skillId: definition.id,userId,earnedXp,level,unlocked: !lockReasons.length,percentage,nextLevelXp,evidence: recent.filter(r => r.skill_id === definition.id).map(evidenceView),evidenceTotal: count,hasMoreEvidence: count > 5,lockReasons,evidenceStatus: count ? 'VERIFIED' : 'NO_VERIFIED_EVIDENCE' };
      visiting.delete(definition.id);results.set(definition.id,result);return result;
    };
    return definitions.map(calculate);
  }
  definitions(input: IdentityPageQueryDto): Promise<SkillDefinitionPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { const [items,total] = await m.findAndCount(SkillDefinition,{ order: { slug: input.order },skip: (input.page-1)*input.pageSize,take: input.pageSize });return { items: items.map(skillView),total,page: input.page,pageSize: input.pageSize }; });
  }
  async definition(id: string): Promise<SkillDefinitionDto> {
    const row = await this.source.manager.findOneBy(SkillDefinition,{ id });if (!row) throw new DomainError(404,'NOT_FOUND','Навичку не знайдено.');return skillView(row);
  }
  own(userId: string,input: IdentityPageQueryDto): Promise<SkillProgressPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { await requireIdentity(m,userId);const all = await this.calculate(m,userId);if (input.order === 'DESC') all.reverse();return { items: all.slice((input.page-1)*input.pageSize,input.page*input.pageSize),total: all.length,page: input.page,pageSize: input.pageSize }; });
  }
  public(userId: string,input: IdentityPageQueryDto): Promise<PublicSkillPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      const profile = await identityProfile(m,userId);if (!profile?.preferences.publicProfile || !profile.preferences.showSkillProgress) return { restricted: true };
      const all = await this.calculate(m,userId), reveal = profile.preferences.showVerifiedHours;
      if (input.order === 'DESC') all.reverse();
      return { restricted: false,items: all.slice((input.page-1)*input.pageSize,input.page*input.pageSize).map(p => ({ skillId: p.skillId,level: p.level,unlocked: p.unlocked,evidenceStatus: p.evidenceStatus,...(reveal ? { earnedXp: p.earnedXp,percentage: p.percentage,nextLevelXp: p.nextLevelXp } : {}) })),total: all.length,page: input.page,pageSize: input.pageSize };
    });
  }
  evidence(userId: string,id: string,input: IdentityPageQueryDto): Promise<SkillEvidencePageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      await requireIdentity(m,userId);if (!(await m.existsBy(SkillDefinition,{ id }))) throw new DomainError(404,'NOT_FOUND','Навичку не знайдено.');
      const result = rows(await m.query(`SELECT e.*,q.title,count(*) OVER()::text AS total FROM user_skill_evidence e JOIN quests q ON q.id=e.quest_id WHERE e.user_id=$1 AND e.skill_id=$2 ORDER BY e.confirmed_at ${input.order},e.id ${input.order} LIMIT $3 OFFSET $4`,[userId,id,input.pageSize,(input.page-1)*input.pageSize]));
      const total = result[0] ? numeric(result[0].total) : numeric(rows(await m.query('SELECT count(*)::text AS total FROM user_skill_evidence WHERE user_id=$1 AND skill_id=$2',[userId,id]))[0]?.total);
      return { items: result.map(evidenceView),total,page: input.page,pageSize: input.pageSize };
    });
  }
}
