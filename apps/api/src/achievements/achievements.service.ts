import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { AchievementDefinition,AchievementUnlock } from './achievement.entity.js';
import { identityProfile,requireIdentity } from '../identity/privacy.js';
import { TeamAccess } from '../teams/team-access.service.js';
import { rows,numeric } from '../progress/sql.js';
import type { IdentityPageQueryDto } from '../skills/skills.dto.js';
import type { AchievementDefinitionPageDto,AchievementUnlockPageDto,AchievementUnlockDto,PublicAchievementPageDto,TeamAchievementDto } from './achievements.dto.js';
export function unlockView(row: AchievementUnlock,owner: boolean,showDate = true): AchievementUnlockDto {
  return { id: row.id,badge: row.badge,achievementId: row.achievementId,...(showDate ? { unlockedAt: row.unlockedAt.toISOString() } : {}),...(owner ? { evidenceIds: row.evidenceIds } : {}) };
}
@Injectable()
export class AchievementsService {
  constructor(private readonly source: DataSource,private readonly teams: TeamAccess) {}
  definitions(input: IdentityPageQueryDto): Promise<AchievementDefinitionPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { const [items,total] = await m.findAndCount(AchievementDefinition,{ order: { scope: 'ASC',slug: input.order },skip: (input.page-1)*input.pageSize,take: input.pageSize });return { items,total,page: input.page,pageSize: input.pageSize }; });
  }
  async pageWithin(manager: EntityManager,userId: string,input: IdentityPageQueryDto,owner: boolean,showDate = true): Promise<AchievementUnlockPageDto> {
    const [items,total] = await manager.findAndCount(AchievementUnlock,{ where: { userId },order: { unlockedAt: input.order,id: input.order },skip: (input.page-1)*input.pageSize,take: input.pageSize });
    return { items: items.map(r => unlockView(r,owner,showDate)),total,page: input.page,pageSize: input.pageSize };
  }
  own(userId: string,input: IdentityPageQueryDto): Promise<AchievementUnlockPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { await requireIdentity(m,userId);return this.pageWithin(m,userId,input,true); });
  }
  public(userId: string,input: IdentityPageQueryDto): Promise<PublicAchievementPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { const profile = await identityProfile(m,userId);if (!profile?.preferences.publicProfile || !profile.preferences.showAchievements) return { restricted: true };return { restricted: false,...await this.pageWithin(m,userId,input,false,profile.preferences.showActivityHistory) }; });
  }
  team(teamId: string,viewerId?: string): Promise<TeamAchievementDto[]> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      await this.teams.read(manager,teamId,viewerId);
      const definitions = await manager.find(AchievementDefinition,{ where: { scope: 'TEAM' },order: { slug: 'ASC' } });
      const unlocks = await manager.find(AchievementUnlock,{ where: { teamId } });
      const facts = rows(await manager.query(`SELECT count(*)::text AS participations,COALESCE(sum(v.verified_minutes),0)::text AS minutes,count(DISTINCT v.quest_id) FILTER(WHERE v.category_id='eco')::text AS eco,count(DISTINCT v.quest_id) FILTER(WHERE v.category_id='city')::text AS city FROM team_activity_attributions a JOIN verified_activities v ON v.id=a.verified_activity_id WHERE a.team_id=$1`,[teamId]))[0];if (!facts) throw new Error('Missing team achievements');
      const result = definitions.map((d): TeamAchievementDto => ({ id: d.id,title: d.title,description: d.description,value: d.requirements.kind === 'TEAM_HOURS' ? numeric(facts.minutes)/60 : d.requirements.kind === 'TEAM_CATEGORY_QUESTS' ? numeric(d.requirements.category === 'eco' ? facts.eco : facts.city) : numeric(facts.participations),target: d.requirements.target,unlocked: unlocks.some(u => u.achievementId === d.id),unlockedAt: unlocks.find(u => u.achievementId === d.id)?.unlockedAt.toISOString() ?? null,periodic: false }));
      const monthly = rows(await manager.query(`WITH ranked AS (SELECT t.id,COALESCE(sum(v.verified_minutes),0) AS minutes,count(DISTINCT v.quest_id) AS quests,row_number() OVER(ORDER BY COALESCE(sum(v.verified_minutes),0) DESC,count(v.id) DESC,t.id ASC) AS rank FROM teams t LEFT JOIN team_activity_attributions a ON a.team_id=t.id LEFT JOIN verified_activities v ON v.id=a.verified_activity_id AND date_trunc('month',v.verified_at AT TIME ZONE 'Europe/Kyiv')=date_trunc('month',now() AT TIME ZONE 'Europe/Kyiv') WHERE t.visibility='PUBLIC' GROUP BY t.id) SELECT minutes::text,quests::text,rank::text FROM ranked WHERE id=$1`,[teamId]))[0];
      result.push({ id: 'team-month',title: 'Команда місяця',description: 'Поточне перше місце серед публічних команд: від 10 годин і двох квестів.',value: monthly ? numeric(monthly.minutes)/60 : 0,target: 10,unlocked: !!monthly && numeric(monthly.rank) === 1 && numeric(monthly.minutes) >= 600 && numeric(monthly.quests) >= 2,unlockedAt: null,periodic: true });return result;
    });
  }
}
