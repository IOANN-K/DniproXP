import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { Role, UserStatus } from '../database/entities/domain.js';
import { DomainError } from '../common/http.js';
import { Team, TeamMembership, TeamInvitation } from './team.entity.js';
import type { TeamRole } from './team.entity.js';
export const TEAM_CAPABILITIES = {
  edit: ['OWNER','MANAGER'], approve: ['OWNER','MANAGER'], invite: ['OWNER','MANAGER'],
  apply: ['OWNER','MANAGER'], roles: ['OWNER'], transfer: ['OWNER'], archive: ['OWNER'],
} satisfies Record<string, TeamRole[]>;
export type TeamCapability = keyof typeof TEAM_CAPABILITIES;
@Injectable()
export class TeamAccess {
  async volunteer(manager: EntityManager, userId: string): Promise<User> {
    const user = await manager.findOneBy(User, { id: userId, status: UserStatus.ACTIVE });
    if (!user?.roles.includes(Role.VOLUNTEER)) throw new DomainError(403, 'FORBIDDEN', 'Потрібен активний обліковий запис волонтера.');
    return user;
  }
  async lock(manager: EntityManager, id: string, active = true): Promise<Team> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Team writes require a transaction');
    const team = await manager.findOne(Team, { where: { id }, lock: { mode: 'for_no_key_update' } });
    if (!team) throw new DomainError(404,'NOT_FOUND','Команду не знайдено.');
    if (active && team.status !== 'ACTIVE') throw new DomainError(409,'TEAM_ARCHIVED','Команду вже архівовано.');
    return team;
  }
  membership(manager: EntityManager, teamId: string, userId: string) {
    return manager.findOneBy(TeamMembership, { teamId,userId,status: 'ACTIVE' });
  }
  async require(manager: EntityManager, teamId: string, userId: string, capability?: TeamCapability): Promise<TeamMembership> {
    await this.volunteer(manager, userId);
    const member = await this.membership(manager, teamId, userId);
    const allowed: readonly TeamRole[] | undefined = capability ? TEAM_CAPABILITIES[capability] : undefined;
    if (!member || (allowed && !allowed.includes(member.role))) throw new DomainError(403,'TEAM_FORBIDDEN','Недостатньо прав у команді.');
    return member;
  }
  async visible(manager: EntityManager, team: Team, viewerId?: string, allowInvitation = true): Promise<boolean> {
    if (team.visibility === 'PUBLIC') return true;
    if (!viewerId) return false;
    if (await this.membership(manager, team.id, viewerId)) return true;
    if (!allowInvitation) return false;
    const invitation = await manager.findOneBy(TeamInvitation, { teamId: team.id, invitedUserId: viewerId,status: 'PENDING' });
    return !!invitation && invitation.expiresAt.getTime() > Date.now();
  }
  async read(manager: EntityManager, id: string, viewerId?: string, allowInvitation = false): Promise<Team> {
    const team = await manager.findOneBy(Team, { id });
    if (!team || !(await this.visible(manager,team,viewerId,allowInvitation))) throw new DomainError(404,'NOT_FOUND','Команду не знайдено.');
    return team;
  }
}
