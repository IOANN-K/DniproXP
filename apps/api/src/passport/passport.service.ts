import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { identityProfile,requireIdentity } from '../identity/privacy.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { SkillProgressEngine } from '../skills/skill-progress.engine.js';
import { AchievementsService } from '../achievements/achievements.service.js';
import { ImpactReceipt } from '../impact/impact.entity.js';
import { preferences } from '../users/projections.js';
import { rows,numeric,text,iso } from '../progress/sql.js';
import type { IdentityPageQueryDto } from '../skills/skills.dto.js';
import type { User } from '../database/entities/user.entity.js';
import type { UserPreferences } from '../database/entities/preferences.entity.js';
import type { PassportSummaryDto,PassportStatsDto,PassportActivityDto,PassportActivityPageDto,PublicPassportDto,PrivatePassportDto,PassportOrganizationDto,PassportTeamDto,PassportPublicContentDto } from './passport.dto.js';
@Injectable()
export class VolunteerPassportService {
  constructor(private readonly source: DataSource,private readonly ledger: LedgerService,private readonly skills: SkillProgressEngine,private readonly achievements: AchievementsService) {}
  private async summary(manager: EntityManager,user: User,prefs: UserPreferences,owner: boolean) {
    const progression = await this.ledger.readProgression(manager,user.id);
    const first = rows(await manager.query('SELECT min(verified_at) AS first FROM verified_activities WHERE user_id=$1',[user.id]))[0];
    const summary: PassportSummaryDto = { userId: user.id,passportId: `DNX-${user.id}`,joinDate: user.createdAt.toISOString(),volunteerSince: first?.first ? iso(first.first) : null,volunteerLevel: progression.currentLevel,totalXp: progression.totalXP,completedQuests: progression.verifiedQuestsCount,...(owner || prefs.showDisplayName ? { displayName: user.displayName,avatar: user.avatarUrl,bio: user.bio } : {}) };
    return { summary,progression };
  }
  private async stats(manager: EntityManager,userId: string,prefs: UserPreferences,owner: boolean): Promise<PassportStatsDto> {
    const p = await this.ledger.readProgression(manager,userId);
    const counts = rows(await manager.query(`SELECT count(DISTINCT v.organization_id)::text AS organizations FROM verified_activities v JOIN organizations o ON o.id=v.organization_id WHERE v.user_id=$1 ${owner ? '' : "AND o.moderation_status='approved'"}`,[userId]))[0];
    const result: PassportStatsDto = { completedQuests: p.verifiedQuestsCount,...(owner || prefs.showVerifiedHours ? { verifiedHours: p.verifiedMinutes === null ? null : p.verifiedMinutes/60,unknownMinutesCount: p.unknownMinutesCount } : {}),...(owner || prefs.showOrganizations ? { organizations: numeric(counts?.organizations) } : {}) };
    if (owner || prefs.showActivityHistory) {
      const facts = rows(await manager.query(`SELECT 'category' AS kind,category_id AS key,count(*)::text AS count,sum(verified_minutes)::text AS minutes FROM verified_activities WHERE user_id=$1 GROUP BY category_id UNION ALL SELECT 'district',district,count(*)::text,sum(verified_minutes)::text FROM verified_activities WHERE user_id=$1 GROUP BY district ORDER BY 1,2`,[userId]));
      const projection = (kind: string) => facts.filter(r => r.kind === kind).map(r => ({ key: text(r.key),contributions: numeric(r.count),...(owner || prefs.showVerifiedHours ? { hours: r.minutes === null ? null : numeric(r.minutes)/60 } : { hours: null }) }));
      result.categories = projection('category');result.districts = projection('district');
    }
    return result;
  }
  private async activitiesWithin(manager: EntityManager,userId: string,input: IdentityPageQueryDto): Promise<PassportActivityPageDto> {
    const result = rows(await manager.query(`SELECT v.id,v.quest_id,v.verified_at,v.verified_minutes,r.id AS receipt_id,r.public_reference,q.title,count(*) OVER()::text AS total FROM verified_activities v JOIN impact_receipts r ON r.verified_activity_id=v.id JOIN quests q ON q.id=v.quest_id WHERE v.user_id=$1 ORDER BY v.verified_at ${input.order},v.id ${input.order} LIMIT $2 OFFSET $3`,[userId,input.pageSize,(input.page-1)*input.pageSize]));
    const total = result[0] ? numeric(result[0].total) : numeric(rows(await manager.query('SELECT count(*)::text AS total FROM verified_activities WHERE user_id=$1',[userId]))[0]?.total);
    const items: PassportActivityDto[] = result.map(r => ({ id: text(r.public_reference),questId: text(r.quest_id),title: text(r.title),confirmedAt: iso(r.verified_at),credentialId: text(r.public_reference),hours: r.verified_minutes === null ? null : numeric(r.verified_minutes)/60,sourceActivityId: text(r.id),receiptId: text(r.receipt_id),verificationStatus: 'VERIFIED' }));
    return { items,total,page: input.page,pageSize: input.pageSize };
  }
  private async organizations(manager: EntityManager,userId: string,publicView: boolean,revealHours: boolean) {
    const result = rows(await manager.query(`SELECT o.id,o.name,count(*)::text AS quests,sum(v.verified_minutes)::text AS minutes,count(*) OVER()::text AS total FROM verified_activities v JOIN organizations o ON o.id=v.organization_id WHERE v.user_id=$1 ${publicView ? "AND o.moderation_status='approved'" : ''} GROUP BY o.id,o.name ORDER BY count(*) DESC,o.id LIMIT 6`,[userId]));
    const items: PassportOrganizationDto[] = result.map(r => ({ organizationId: text(r.id),name: text(r.name),completedQuests: numeric(r.quests),...(revealHours ? { verifiedHours: r.minutes === null ? null : numeric(r.minutes)/60 } : {}) }));
    return { items,total: result[0] ? numeric(result[0].total) : 0 };
  }
  private async teams(manager: EntityManager,userId: string,publicView: boolean) {
    const result = rows(await manager.query(`SELECT t.id,t.name,t.slug,m.role,m.joined_at,count(*) OVER()::text AS total FROM team_memberships m JOIN teams t ON t.id=m.team_id WHERE m.user_id=$1 AND m.status='ACTIVE' ${publicView ? "AND t.visibility='PUBLIC'" : ''} ORDER BY m.joined_at DESC,t.id LIMIT 6`,[userId]));
    const items: PassportTeamDto[] = result.map(r => ({ id: text(r.id),name: text(r.name),slug: text(r.slug),role: text(r.role),joinedAt: iso(r.joined_at) }));
    return { items,total: result[0] ? numeric(result[0].total) : 0 };
  }
  own(userId: string): Promise<PrivatePassportDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      const { user,preferences: prefs } = await requireIdentity(manager,userId), { summary,progression } = await this.summary(manager,user,prefs,true);
      const statistics = await this.stats(manager,userId,prefs,true), input = { page: 1,pageSize: 6,order: 'DESC' } satisfies IdentityPageQueryDto;
      const achievements = await this.achievements.pageWithin(manager,userId,input,true), skills = await this.skills.calculate(manager,userId);
      const organizationExperience = await this.organizations(manager,userId,false,true), teams = await this.teams(manager,userId,false), activities = await this.activitiesWithin(manager,userId,input);
      const [receipts,receiptsTotal] = await manager.findAndCount(ImpactReceipt,{ where: { userId },order: { issuedAt: 'DESC',id: 'DESC' },take: 6 });
      return { ...summary,statistics,achievements: achievements.items,achievementsTotal: achievements.total,skillProgress: skills.slice(0,6),skillsTotal: skills.length,organizationExperience: organizationExperience.items,organizationsTotal: organizationExperience.total,teams: teams.items,teamsTotal: teams.total,activityHistory: activities.items,receipts: receipts.map(r => ({ id: r.id,publicReference: r.publicReference,questId: r.questId,verifiedAt: r.verifiedAt.toISOString(),verifiedMinutes: r.verifiedMinutes })),receiptsTotal,visibilitySettings: preferences(prefs),rewardPointsBalance: progression.rewardPointsBalance };
    });
  }
  public(userId: string): Promise<PublicPassportDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      const profile = await identityProfile(manager,userId);if (!profile?.preferences.publicProfile) return { restricted: true };
      const { user,preferences: prefs } = profile, { summary } = await this.summary(manager,user,prefs,false);
      // Volunteer-since is an activity timestamp, not registration metadata.
      if (!prefs.showActivityHistory) summary.volunteerSince = null;
      const passport: PassportPublicContentDto = { ...summary,statistics: await this.stats(manager,userId,prefs,false) }, input = { page: 1,pageSize: 6,order: 'DESC' } satisfies IdentityPageQueryDto;
      if (prefs.showAchievements) { const page = await this.achievements.pageWithin(manager,userId,input,false,prefs.showActivityHistory);passport.achievements = page.items;passport.achievementsTotal = page.total; }
      if (prefs.showSkillProgress) {
        const progress = await this.skills.calculate(manager,userId);passport.skillProgress = progress.slice(0,6).map(p => ({ skillId: p.skillId,level: p.level,unlocked: p.unlocked,evidenceStatus: p.evidenceStatus,...(prefs.showVerifiedHours ? { earnedXp: p.earnedXp,percentage: p.percentage,nextLevelXp: p.nextLevelXp } : {}) }));passport.skillsTotal = progress.length;
      }
      if (prefs.showOrganizations) { const experience = await this.organizations(manager,userId,true,prefs.showVerifiedHours);passport.organizationExperience = experience.items;passport.organizationsTotal = experience.total; }
      if (prefs.showTeams) { const teams = await this.teams(manager,userId,true);passport.teams = teams.items;passport.teamsTotal = teams.total; }
      if (prefs.showActivityHistory) {
        const activities = await this.activitiesWithin(manager,userId,input);
        passport.activityHistory = activities.items.map(a => ({ id: a.id,questId: a.questId,title: a.title,confirmedAt: a.confirmedAt,credentialId: a.credentialId,...(prefs.showVerifiedHours ? { hours: a.hours } : {}) }));
      }
      return { restricted: false,passport };
    });
  }
  activities(userId: string,input: IdentityPageQueryDto): Promise<PassportActivityPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { await requireIdentity(m,userId);return this.activitiesWithin(m,userId,input); });
  }
}
