import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import { TeamAccess } from './team-access.service.js';
import { Team, TeamMembership, TeamInvitation, TeamJoinRequest } from './team.entity.js';
import type { TeamFormDto, UpdateTeamDto, MemberRoleDto, InvitationDto, JoinRequestDto } from './team.dto.js';

export function invitationView(row: TeamInvitation, now = Date.now()): InvitationDto {
  return { id: row.id,teamId: row.teamId,invitedUserId: row.invitedUserId,invitedBy: row.invitedBy,status: row.status === 'PENDING' && row.expiresAt.getTime() <= now ? 'EXPIRED' : row.status,createdAt: row.createdAt.toISOString(),expiresAt: row.expiresAt.toISOString(),resolvedAt: row.resolvedAt?.toISOString() ?? null };
}
export function requestView(row: TeamJoinRequest): JoinRequestDto {
  return { id: row.id,teamId: row.teamId,userId: row.userId,status: row.status,reason: row.reason,createdAt: row.createdAt.toISOString(),reviewedAt: row.reviewedAt?.toISOString() ?? null,reviewedBy: row.reviewedBy };
}
@Injectable()
export class TeamsService {
  constructor(private readonly transactions: Transactions, private readonly access: TeamAccess, private readonly audit: AuditService) {}
  async createWithin(manager: EntityManager, actorId: string, input: TeamFormDto, seedKey?: string): Promise<Team> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Team creation requires a transaction');
    await this.access.volunteer(manager,actorId);
    const id = randomUUID(), joinPolicy = input.joinPolicy ?? (input.visibility === 'PUBLIC' ? 'OPEN' : 'INVITE_ONLY');
    if (input.visibility === 'PRIVATE' && joinPolicy !== 'INVITE_ONLY') throw new DomainError(422,'VALIDATION_FAILED','Приватна команда потребує запрошення.');
    const team = await manager.save(Team,manager.create(Team,{ id,slug: `komanda-${id}`,name: input.name,description: input.description,category: input.category,city: input.city,avatar: input.avatar,coverImage: input.coverImage,visibility: input.visibility,joinPolicy,memberLimit: input.maxMembers,captainUserId: actorId,status: 'ACTIVE',seedKey: seedKey ?? null }));
    await manager.save(TeamMembership,manager.create(TeamMembership,{ teamId: id,userId: actorId,role: 'OWNER',status: 'ACTIVE',leftAt: null,invitedBy: null,approvedBy: null }));
    await manager.query('INSERT INTO team_progress_locks(team_id) VALUES($1)',[id]);
    await this.audit.record(manager,actorId,'TEAM_CREATED','team',id);
    return team;
  }
  create(actorId: string,input: TeamFormDto) { return this.transactions.run(m => this.createWithin(m,actorId,input)); }
  update(actorId: string,id: string,input: UpdateTeamDto): Promise<Team> {
    return this.transactions.run(async manager => {
      const team = await this.access.lock(manager,id); await this.access.require(manager,id,actorId,'edit');
      const count = await manager.countBy(TeamMembership,{ teamId: id,status: 'ACTIVE' });
      if (input.maxMembers !== undefined && input.maxMembers < count) throw new DomainError(409,'TEAM_CAPACITY_EXCEEDED','Ліміт менший за кількість учасників.');
      const visibility = input.visibility ?? team.visibility;
      const policy = input.joinPolicy ?? (input.visibility && input.visibility !== team.visibility ? (visibility === 'PUBLIC' ? 'OPEN' : 'INVITE_ONLY') : team.joinPolicy);
      if (visibility === 'PRIVATE' && policy !== 'INVITE_ONLY') throw new DomainError(422,'VALIDATION_FAILED','Приватна команда потребує запрошення.');
      for (const key of ['name','description','category','city','avatar','coverImage','visibility'] as const) if (input[key] !== undefined) Object.assign(team,{ [key]: input[key] });
      team.joinPolicy = policy; team.memberLimit = input.maxMembers ?? team.memberLimit;
      await manager.save(team); await this.audit.record(manager,actorId,'TEAM_UPDATED','team',id); return team;
    });
  }
  async addWithin(manager: EntityManager,team: Team,userId: string,approvedBy: string | null,invitedBy: string | null): Promise<TeamMembership> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Membership changes require a transaction');
    await this.access.volunteer(manager,userId);
    const old = await this.access.membership(manager,team.id,userId); if (old) return old;
    if (team.status !== 'ACTIVE' || await manager.countBy(TeamMembership,{ teamId: team.id,status: 'ACTIVE' }) >= team.memberLimit) throw new DomainError(409,'TEAM_CAPACITY_EXCEEDED','Команда недоступна або немає вільних місць.');
    return manager.save(TeamMembership,manager.create(TeamMembership,{ teamId: team.id,userId,role: 'MEMBER',status: 'ACTIVE',leftAt: null,approvedBy,invitedBy }));
  }
  join(actorId: string,id: string): Promise<JoinRequestDto> { return this.transactions.run(m => this.joinWithin(m,actorId,id)); }
  async joinWithin(manager: EntityManager,actorId: string,id: string): Promise<JoinRequestDto> {
      const team = await this.access.lock(manager,id); await this.access.volunteer(manager,actorId);
      if (team.visibility !== 'PUBLIC' || team.joinPolicy === 'INVITE_ONLY') throw new DomainError(403,'INVITATION_REQUIRED','До цієї команди потрібне запрошення.');
      const pending = await manager.findOneBy(TeamJoinRequest,{ teamId: id,userId: actorId,status: 'PENDING' }); if (pending) return requestView(pending);
      if (await this.access.membership(manager,id,actorId)) {
        const old = await manager.findOne(TeamJoinRequest,{ where: { teamId: id,userId: actorId,status: 'APPROVED' },order: { createdAt: 'DESC' } });
        if (old) return requestView(old); throw new DomainError(409,'ALREADY_MEMBER','Ти вже є учасником команди.');
      }
      if (await manager.countBy(TeamMembership,{ teamId: id,status: 'ACTIVE' }) >= team.memberLimit) throw new DomainError(409,'TEAM_CAPACITY_EXCEEDED','У команді немає вільних місць.');
      const open = team.joinPolicy === 'OPEN';
      const request = await manager.save(TeamJoinRequest,manager.create(TeamJoinRequest,{ teamId: id,userId: actorId,status: open ? 'APPROVED' : 'PENDING',reason: null,reviewedAt: open ? new Date() : null,reviewedBy: null }));
      if (open) await this.addWithin(manager,team,actorId,null,null);
      await this.audit.record(manager,actorId,open ? 'TEAM_JOINED_OPEN' : 'TEAM_JOIN_REQUESTED','team_join_request',request.id,{ teamId: id }); return requestView(request);
  }
  requestAction(actorId: string,teamId: string,id: string,action: 'approve' | 'reject' | 'cancel',reason: string | null): Promise<JoinRequestDto> {
    return this.transactions.run(async manager => {
      const team = await this.access.lock(manager,teamId);
      const row = await manager.findOneBy(TeamJoinRequest,{ id,teamId }); if (!row) throw new DomainError(404,'NOT_FOUND','Заявку не знайдено.');
      if (action === 'cancel') { if (row.userId !== actorId) throw new DomainError(404,'NOT_FOUND','Заявку не знайдено.'); }
      else { await this.access.require(manager,teamId,actorId,'approve'); if (row.userId === actorId) throw new DomainError(403,'SELF_REVIEW_FORBIDDEN','Власну заявку не можна схвалювати.'); }
      const target = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CANCELLED';
      if (row.status === target) return requestView(row);
      if (row.status !== 'PENDING') throw new DomainError(409,'REQUEST_RESOLVED','Заявку вже опрацьовано.');
      if (action === 'reject' && (!reason || reason.trim().length < 5)) throw new DomainError(422,'REASON_REQUIRED','Вкажи причину відхилення.');
      if (action === 'approve') await this.addWithin(manager,team,row.userId,actorId,null);
      row.status = target;row.reason = reason;row.reviewedBy = actorId;row.reviewedAt = new Date();await manager.save(row);
      await this.audit.record(manager,actorId,`TEAM_REQUEST_${target}`,'team_join_request',id);return requestView(row);
    });
  }
  async inviteWithin(manager: EntityManager,actorId: string,teamId: string,userId: string): Promise<InvitationDto> {
    await this.access.lock(manager,teamId);await this.access.require(manager,teamId,actorId,'invite');await this.access.volunteer(manager,userId);
    if (await this.access.membership(manager,teamId,userId)) throw new DomainError(409,'ALREADY_MEMBER','Волонтер уже в команді.');
    await manager.query("UPDATE team_invitations SET status='EXPIRED',resolved_at=clock_timestamp() WHERE team_id=$1 AND invited_user_id=$2 AND status='PENDING' AND expires_at<=clock_timestamp()",[teamId,userId]);
    const old = await manager.findOneBy(TeamInvitation,{ teamId,invitedUserId: userId,status: 'PENDING' }); if (old) return invitationView(old);
    const row = await manager.save(TeamInvitation,manager.create(TeamInvitation,{ teamId,invitedUserId: userId,invitedBy: actorId,status: 'PENDING',expiresAt: new Date(Date.now()+7*86400000),resolvedAt: null }));
    await this.audit.record(manager,actorId,'TEAM_INVITATION_CREATED','team_invitation',row.id,{ teamId,userId });return invitationView(row);
  }
  invite(actorId: string,teamId: string,userId: string) { return this.transactions.run(m => this.inviteWithin(m,actorId,teamId,userId)); }
  async invitationAction(actorId: string,id: string,action: 'accept' | 'decline' | 'revoke'): Promise<InvitationDto> {
    const result = await this.transactions.run(m => this.invitationWithin(m,actorId,id,action));
    if (result.status === 'EXPIRED' && action !== 'revoke') throw new DomainError(409,'INVITATION_EXPIRED','Термін запрошення минув.');
    return result;
  }
  async invitationWithin(manager: EntityManager,actorId: string,id: string,action: 'accept' | 'decline' | 'revoke'): Promise<InvitationDto> {
    const ref = await manager.findOneBy(TeamInvitation,{ id });if (!ref) throw new DomainError(404,'NOT_FOUND','Запрошення не знайдено.');
    
      const team = await this.access.lock(manager,ref.teamId,false);const row = await manager.findOneByOrFail(TeamInvitation,{ id });
      if (action === 'revoke') await this.access.require(manager,team.id,actorId,'invite');
      else if (row.invitedUserId !== actorId) throw new DomainError(404,'NOT_FOUND','Запрошення не знайдено.');
      const target = action === 'accept' ? 'ACCEPTED' : action === 'decline' ? 'DECLINED' : 'REVOKED';
      if (row.status === target || row.status === 'EXPIRED') return invitationView(row);
      if (row.status !== 'PENDING') throw new DomainError(409,'INVITATION_RESOLVED','Запрошення вже опрацьовано.');
      if (row.expiresAt.getTime() <= Date.now()) row.status = 'EXPIRED';
      else {
        if (team.status !== 'ACTIVE') throw new DomainError(409,'TEAM_ARCHIVED','Команду архівовано.');
        if (action === 'accept') await this.addWithin(manager,team,actorId,null,row.invitedBy);
        row.status = target;
      }
      row.resolvedAt = new Date();await manager.save(row);await this.audit.record(manager,actorId,`TEAM_INVITATION_${row.status}`,'team_invitation',row.id);return invitationView(row);
  }
  memberAction(actorId: string,teamId: string,userId: string,action: 'leave' | 'remove' | 'role' | 'transfer',input?: MemberRoleDto): Promise<Team> {
    return this.transactions.run(async manager => {
      const team = await this.access.lock(manager,teamId);const actor = await this.access.require(manager,teamId,actorId,action === 'transfer' ? 'transfer' : action === 'role' ? 'roles' : action === 'remove' ? 'approve' : undefined);
      const target = await this.access.membership(manager,teamId,userId);if (!target) throw new DomainError(404,'NOT_FOUND','Активного учасника не знайдено.');
      if (action === 'transfer') {
        if (userId === actorId) throw new DomainError(409,'INVALID_TARGET','Обери іншого учасника.');await this.access.volunteer(manager,userId);
        actor.role = 'MANAGER';await manager.save(actor);target.role = 'OWNER';await manager.save(target);team.captainUserId = userId;await manager.save(team);
      } else if (action === 'role') {
        if (!input || target.role === 'OWNER' || userId === actorId) throw new DomainError(403,'FORBIDDEN','Власника не можна змінити цією дією.');target.role = input.role;await manager.save(target);
      } else {
        if (target.role === 'OWNER' || (action === 'leave' && userId !== actorId) || (action === 'remove' && (userId === actorId || (actor.role === 'MANAGER' && target.role !== 'MEMBER')))) throw new DomainError(403,'FORBIDDEN','Спочатку передай керування або перевір роль учасника.');
        target.status = action === 'leave' ? 'LEFT' : 'REMOVED';target.leftAt = new Date();await manager.save(target);
      }
      await this.audit.record(manager,actorId,`TEAM_MEMBER_${action.toUpperCase()}`,'team',teamId,{ userId });return team;
    });
  }
  archive(actorId: string,id: string): Promise<Team> {
    return this.transactions.run(async manager => {
      const team = await this.access.lock(manager,id,false);await this.access.require(manager,id,actorId,'archive');if (team.status === 'ARCHIVED') return team;
      const unresolved: unknown = await manager.query(`SELECT 1 FROM team_quest_applications g JOIN team_quest_application_members m ON m.team_application_id=g.id JOIN quest_applications a ON a.id=m.application_id LEFT JOIN participations p ON p.application_id=a.id WHERE g.team_id=$1 AND a.team_application_id=g.id AND (a.status='pending' OR (a.status='approved' AND p.status NOT IN ('completed','cancelled'))) LIMIT 1`,[id]);
      if (Array.isArray(unresolved) && unresolved.length) throw new DomainError(409,'UNRESOLVED_TEAM_ACTIVITIES','Спочатку врегулюй командні заявки й участі.');
      team.status = 'ARCHIVED';await manager.save(team);
      await manager.query("UPDATE team_invitations SET status='REVOKED',resolved_at=clock_timestamp() WHERE team_id=$1 AND status='PENDING'",[id]);
      await manager.query("UPDATE team_join_requests SET status='CANCELLED',reviewed_at=clock_timestamp(),reviewed_by=$2 WHERE team_id=$1 AND status='PENDING'",[id,actorId]);
      await this.audit.record(manager,actorId,'TEAM_ARCHIVED','team',id);return team;
    });
  }
}
