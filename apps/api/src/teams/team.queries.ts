import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Team, TeamInvitation, TeamJoinRequest, TeamMembership } from './team.entity.js';
import { TeamAccess } from './team-access.service.js';
import { invitationView, requestView } from './teams.service.js';
import { rows, numeric, text, iso } from '../progress/sql.js';
import { physicalMetrics,physicalUnits } from '../progress/domain.js';
import type { TeamQueryDto, TeamHistoryQueryDto, TeamMemberQueryDto, TeamPeriodQueryDto, TeamPeriodPageQueryDto, TeamLeaderboardQueryDto, TeamRankingQueryDto, TeamDto, TeamPageDto, MemberPageDto, InvitationPageDto, JoinRequestPageDto, TeamStatisticsDto, TeamContributionPageDto, TeamLeaderboardDto, TeamRankingDto } from './team.dto.js';
export function teamView(t: Team, count: number, scoped = false,totals?: { totalVerifiedHours: number | null;totalCompletedQuests: number;totalXP: number }): TeamDto {
  return { ...totals,id: t.id,slug: t.slug,name: t.name,description: t.description,avatar: t.avatar,coverImage: t.coverImage,category: t.category,city: t.city,visibility: t.visibility,joinPolicy: t.joinPolicy,maxMembers: t.memberLimit,memberCount: count,status: t.status,createdAt: t.createdAt.toISOString(),updatedAt: t.updatedAt.toISOString(),...(scoped ? { ownerId: t.captainUserId,captainUserId: t.captainUserId } : {}) };
}
// Counts remain anonymous. Named contribution rows have a stricter per-profile privacy gate.
const named = `(prefs.public_profile AND prefs.show_display_name AND prefs.show_teams AND prefs.show_activity_history AND prefs.show_verified_hours AND u.status='ACTIVE')`;
@Injectable()
export class TeamQueries {
  constructor(private readonly source: DataSource,private readonly access: TeamAccess) {}
  private async totals(manager: EntityManager,ids: string[]) {
    if (!ids.length) return new Map<string,{ totalVerifiedHours: number | null;totalCompletedQuests: number;totalXP: number }>();
    const result = rows(await manager.query(`SELECT t.id,sum(v.verified_minutes)::text AS minutes,COALESCE(sum(v.xp_awarded),0)::text AS xp,
      (SELECT count(*)::text FROM team_application_progress g WHERE g.team_id=t.id AND g.computed_status='COMPLETED') AS completed
      FROM teams t LEFT JOIN team_activity_attributions a ON a.team_id=t.id LEFT JOIN verified_activities v ON v.id=a.verified_activity_id WHERE t.id=ANY($1::uuid[]) GROUP BY t.id`,[ids]));
    return new Map(result.map((row): [string,{ totalVerifiedHours: number | null;totalCompletedQuests: number;totalXP: number }] => [text(row.id),{ totalVerifiedHours: row.minutes === null ? null : numeric(row.minutes)/60,totalCompletedQuests: numeric(row.completed),totalXP: numeric(row.xp) }]));
  }
  async detail(manager: EntityManager,id: string,viewerId?: string): Promise<TeamDto> {
    const team = await this.access.read(manager,id,viewerId,true), membership = viewerId ? await this.access.membership(manager,id,viewerId) : null;
    return teamView(team,await manager.countBy(TeamMembership,{ teamId: id,status: 'ACTIVE' }),!!membership,team.visibility === 'PUBLIC' || membership ? (await this.totals(manager,[id])).get(id) : undefined);
  }
  get(id: string,viewerId?: string) { return this.source.transaction('REPEATABLE READ',m => this.detail(m,id,viewerId)); }
  list(input: TeamQueryDto,viewerId?: string,own = false): Promise<TeamPageDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      const query = manager.createQueryBuilder(Team,'t');
      const member = `EXISTS(SELECT 1 FROM team_memberships tm WHERE tm.team_id=t.id AND tm.user_id=:viewer AND tm.status='ACTIVE')`;
      query.where(own ? member : `(t.visibility='PUBLIC' OR ${member} OR EXISTS(SELECT 1 FROM team_invitations inv WHERE inv.team_id=t.id AND inv.invited_user_id=:viewer AND inv.status='PENDING' AND inv.expires_at>now()))`,{ viewer: viewerId ?? null });
      if (input.category) query.andWhere('t.category=:category',{ category: input.category });
      if (input.search) query.andWhere('t.name ILIKE :search',{ search: `%${input.search.replace(/[\\%_]/g,'\\$&')}%` });
      const [items,total] = await query.orderBy('t.createdAt',input.order).addOrderBy('t.id',input.order).skip((input.page-1)*input.pageSize).take(input.pageSize).getManyAndCount();
      const ids = items.map(t => t.id), counts = ids.length ? rows(await manager.query("SELECT team_id,count(*)::text AS count,bool_or(user_id=$2::uuid) AS own FROM team_memberships WHERE status='ACTIVE' AND team_id=ANY($1::uuid[]) GROUP BY team_id",[ids,viewerId ?? null])) : [];
      const totals = await this.totals(manager,ids);
      return { items: items.map(t => { const r = counts.find(r => r.team_id === t.id);return teamView(t,r ? numeric(r.count) : 0,r?.own === true,t.visibility === 'PUBLIC' || r?.own === true ? totals.get(t.id) : undefined); }),total,page: input.page,pageSize: input.pageSize };
    });
  }
  members(id: string,input: TeamMemberQueryDto,viewerId?: string): Promise<MemberPageDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      await this.access.read(manager,id,viewerId);const inside = viewerId ? !!await this.access.membership(manager,id,viewerId) : false;
      const result = rows(await manager.query(`SELECT m.id,m.team_id,m.user_id,m.role,m.status,m.joined_at,u.display_name,u.avatar_url,count(*) OVER()::text AS total
        FROM team_memberships m JOIN users u ON u.id=m.user_id JOIN user_preferences p ON p.user_id=u.id
        WHERE m.team_id=$1 AND m.status='ACTIVE' AND ($2::boolean OR (p.public_profile AND p.show_display_name AND p.show_teams AND u.status='ACTIVE'))
        ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,m.joined_at,m.id LIMIT $3 OFFSET $4`,[id,inside,input.pageSize,(input.page-1)*input.pageSize]));
      const total = result[0] ? numeric(result[0].total) : numeric(rows(await manager.query(`SELECT count(*)::text AS total FROM team_memberships m JOIN users u ON u.id=m.user_id JOIN user_preferences p ON p.user_id=u.id WHERE m.team_id=$1 AND m.status='ACTIVE' AND ($2::boolean OR (p.public_profile AND p.show_display_name AND p.show_teams AND u.status='ACTIVE'))`,[id,inside]))[0]?.total);
      return { items: result.map(r => ({ id: text(r.id),teamId: text(r.team_id),userId: text(r.user_id),displayName: text(r.display_name),avatarUrl: r.avatar_url === null ? null : text(r.avatar_url),role: text(r.role),status: text(r.status),joinedAt: iso(r.joined_at) })),total,page: input.page,pageSize: input.pageSize };
    });
  }
  invitations(userId: string,input: TeamHistoryQueryDto): Promise<InvitationPageDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      const [items,total] = await manager.findAndCount(TeamInvitation,{ where: { invitedUserId: userId },order: { createdAt: input.order,id: input.order },skip: (input.page-1)*input.pageSize,take: input.pageSize });
      return { items: items.map(row => invitationView(row)),total,page: input.page,pageSize: input.pageSize };
    });
  }
  requests(userId: string,input: TeamHistoryQueryDto,teamId?: string): Promise<JoinRequestPageDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      if (teamId) await this.access.require(manager,teamId,userId,'approve');
      const [items,total] = await manager.findAndCount(TeamJoinRequest,{ where: teamId ? { teamId } : { userId },order: { createdAt: input.order,id: input.order },skip: (input.page-1)*input.pageSize,take: input.pageSize });
      return { items: items.map(requestView),total,page: input.page,pageSize: input.pageSize };
    });
  }
  statistics(id: string,input: TeamPeriodQueryDto,viewerId?: string): Promise<TeamStatisticsDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      await this.access.read(manager,id,viewerId);
      const period = input.period === 'month' ? "AND date_trunc('month',v.verified_at AT TIME ZONE 'Europe/Kyiv')=date_trunc('month',now() AT TIME ZONE 'Europe/Kyiv')" : '';
      const from = `FROM team_activity_attributions a JOIN verified_activities v ON v.id=a.verified_activity_id WHERE a.team_id=$1 ${period}`;
      const row = rows(await manager.query(`SELECT count(*)::text AS participations,count(DISTINCT v.quest_id)::text AS quests,count(DISTINCT v.user_id)::text AS volunteers,sum(v.verified_minutes)::text AS minutes,COALESCE(sum(v.xp_awarded),0)::text AS xp,count(*) FILTER(WHERE v.verified_minutes IS NULL)::text AS unknown ${from}`,[id]))[0];if (!row) throw new Error('Missing team statistics');
      const dimensions = rows(await manager.query(`SELECT 'category' AS kind,v.category_id AS key,count(*)::text AS contributions,sum(v.verified_minutes)::text AS minutes ${from} GROUP BY v.category_id
        UNION ALL SELECT 'district',v.district,count(*)::text,sum(v.verified_minutes)::text ${from} GROUP BY v.district
        UNION ALL SELECT 'day',to_char(v.verified_at AT TIME ZONE 'Europe/Kyiv','YYYY-MM-DD'),count(*)::text,sum(v.verified_minutes)::text ${from} GROUP BY 2 ORDER BY 1,2`,[id]));
      const physical = rows(await manager.query(`SELECT m.metric,sum(m.value)::text AS value FROM current_collective_impact m WHERE m.quest_id IN (SELECT DISTINCT v.quest_id ${from}) GROUP BY m.metric`,[id]));
      const completed = rows(await manager.query(`SELECT count(*)::text AS count FROM team_application_progress g WHERE g.team_id=$1 AND g.computed_status='COMPLETED' AND g.quest_id IN (SELECT DISTINCT v.quest_id ${from})`,[id]))[0];
      const group = (kind: string) => dimensions.filter(r => r.kind === kind).map(r => ({ key: text(r.key),contributions: numeric(r.contributions),hours: r.minutes === null ? null : numeric(r.minutes)/60 }));
      return { teamId: id,activeMembers: await manager.countBy(TeamMembership,{ teamId: id,status: 'ACTIVE' }),verifiedQuests: numeric(row.quests),completedQuests: numeric(completed?.count),verifiedParticipations: numeric(row.participations),volunteers: numeric(row.volunteers),hours: row.minutes === null ? null : numeric(row.minutes)/60,unknownMinutesCount: numeric(row.unknown),xp: numeric(row.xp),categories: group('category'),districts: group('district'),trends: group('day'),impacts: physicalMetrics.map(metric => { const found = physical.find(r => r.metric === metric);return { metric,unit: physicalUnits[metric],value: found ? numeric(found.value) : null,provenance: 'QUEST_SHARED_NOT_ADDITIVE' }; }) };
    });
  }
  contributions(input: TeamPeriodPageQueryDto,viewerId?: string,teamId?: string,own = false): Promise<TeamContributionPageDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      if (teamId) await this.access.read(manager,teamId,viewerId);
      const conditions = (own ? 'v.user_id=$1' : `a.team_id=$1 AND (${named} OR v.user_id=$2::uuid)`) + (input.period === 'month' ? " AND date_trunc('month',v.verified_at AT TIME ZONE 'Europe/Kyiv')=date_trunc('month',now() AT TIME ZONE 'Europe/Kyiv')" : '');
      const from = `FROM team_activity_attributions a JOIN verified_activities v ON v.id=a.verified_activity_id JOIN quests q ON q.id=v.quest_id JOIN users u ON u.id=v.user_id JOIN user_preferences prefs ON prefs.user_id=u.id WHERE ${conditions}`;
      const args: unknown[] = own ? [viewerId] : [teamId,viewerId ?? null];
      const limit = args.length+1,offset = args.length+2;
      const result = rows(await manager.query(`SELECT a.id,a.team_id,a.team_application_id,v.user_id,v.quest_id,q.title,v.verified_at,v.verified_minutes,v.xp_awarded,count(*) OVER()::text AS total ${from} ORDER BY v.verified_at ${input.order},a.id ${input.order} LIMIT $${limit} OFFSET $${offset}`,[...args,input.pageSize,(input.page-1)*input.pageSize]));
      const total = result[0] ? numeric(result[0].total) : numeric(rows(await manager.query(`SELECT count(*)::text AS total ${from}`,args))[0]?.total);
      return { items: result.map(r => ({ id: text(r.id),teamId: text(r.team_id),...(own || r.user_id === viewerId ? { teamApplicationId: text(r.team_application_id) } : {}),userId: text(r.user_id),questId: text(r.quest_id),title: text(r.title),verifiedAt: iso(r.verified_at),hours: r.verified_minutes === null ? null : numeric(r.verified_minutes)/60,xp: numeric(r.xp_awarded) })),total,page: input.page,pageSize: input.pageSize };
    });
  }
  leaderboard(id: string,input: TeamLeaderboardQueryDto,viewerId?: string): Promise<TeamLeaderboardDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      await this.access.read(manager,id,viewerId);
      const period = input.period === 'month' ? "AND date_trunc('month',v.verified_at AT TIME ZONE 'Europe/Kyiv')=date_trunc('month',now() AT TIME ZONE 'Europe/Kyiv')" : '';
      const base = `FROM team_activity_attributions a JOIN verified_activities v ON v.id=a.verified_activity_id JOIN users u ON u.id=v.user_id JOIN user_preferences prefs ON prefs.user_id=u.id WHERE a.team_id=$1 AND ${named} AND v.verified_minutes IS NOT NULL ${period} GROUP BY v.user_id,u.display_name`;
      const result = rows(await manager.query(`WITH ranked AS (SELECT v.user_id,u.display_name,sum(v.verified_minutes) AS minutes,count(*) AS participations ${base}), numbered AS (SELECT *,row_number() OVER(ORDER BY minutes DESC,participations DESC,user_id ASC) AS rank FROM ranked) SELECT *,count(*) OVER()::text AS total FROM numbered ORDER BY rank LIMIT $2 OFFSET $3`,[id,input.pageSize,(input.page-1)*input.pageSize]));
      const total = result[0] ? numeric(result[0].total) : numeric(rows(await manager.query(`SELECT count(*)::text AS total FROM (SELECT v.user_id ${base}) ranked`,[id]))[0]?.total);
      return { items: result.map(r => ({ userId: text(r.user_id),displayName: text(r.display_name),hours: numeric(r.minutes)/60,participations: numeric(r.participations),rank: numeric(r.rank) })),total,page: input.page,pageSize: input.pageSize };
    });
  }
  ranking(input: TeamRankingQueryDto): Promise<TeamRankingDto> {
    return this.source.transaction('REPEATABLE READ',async manager => {
      const period = input.period === 'month' ? "AND date_trunc('month',v.verified_at AT TIME ZONE 'Europe/Kyiv')=date_trunc('month',now() AT TIME ZONE 'Europe/Kyiv')" : '';
      const eligible = `FROM teams t LEFT JOIN team_activity_attributions a ON a.team_id=t.id LEFT JOIN verified_activities v ON v.id=a.verified_activity_id ${period} WHERE t.visibility='PUBLIC'`;
      const sql = `WITH totals AS (SELECT t.id,sum(v.verified_minutes) AS minutes,count(v.id) AS participations ${eligible} ${input.category ? 'AND t.category=$3' : ''} GROUP BY t.id),ranked AS (SELECT *,row_number() OVER(ORDER BY COALESCE(minutes,0) DESC,participations DESC,id ASC) AS rank FROM totals) SELECT *,count(*) OVER()::text AS total FROM ranked ORDER BY rank LIMIT $1 OFFSET $2`;
      const args: unknown[] = [input.pageSize,(input.page-1)*input.pageSize];if (input.category) args.push(input.category);
      const result = rows(await manager.query(sql,args));const ids = result.map(r => text(r.id));
      const teams = ids.length ? await manager.createQueryBuilder(Team,'t').where('t.id IN (:...ids)',{ ids }).getMany() : [];
      const members = ids.length ? rows(await manager.query("SELECT team_id,count(*)::text AS count FROM team_memberships WHERE team_id=ANY($1::uuid[]) AND status='ACTIVE' GROUP BY team_id",[ids])) : [];
      const month = rows(await manager.query(`SELECT a.team_id,sum(v.verified_minutes)::text AS minutes,count(DISTINCT v.quest_id)::text AS quests FROM team_activity_attributions a JOIN teams t ON t.id=a.team_id JOIN verified_activities v ON v.id=a.verified_activity_id WHERE t.visibility='PUBLIC' AND date_trunc('month',v.verified_at AT TIME ZONE 'Europe/Kyiv')=date_trunc('month',now() AT TIME ZONE 'Europe/Kyiv') GROUP BY a.team_id ORDER BY COALESCE(sum(v.verified_minutes),0) DESC,count(*) DESC,a.team_id ASC LIMIT 1`));const winner = month[0];
      const total = result[0] ? numeric(result[0].total) : await manager.countBy(Team,input.category ? { visibility: 'PUBLIC',category: input.category } : { visibility: 'PUBLIC' });
      return { items: result.map(r => { const team = teams.find(t => t.id === r.id);if (!team) throw new Error('Missing ranked team');const count = members.find(m => m.team_id === team.id);return { team: teamView(team,count ? numeric(count.count) : 0),rank: numeric(r.rank),hours: r.minutes === null ? null : numeric(r.minutes)/60,verifiedParticipations: numeric(r.participations),currentMonthBadge: winner?.team_id === team.id && winner.minutes !== null && numeric(winner.minutes) >= 600 && numeric(winner.quests) >= 2 }; }),total,page: input.page,pageSize: input.pageSize };
    });
  }
}
