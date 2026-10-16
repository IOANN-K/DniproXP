import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Transactions } from '../database/database.module.js';
import { User } from '../database/entities/user.entity.js';
import { Role, UserStatus } from '../database/entities/domain.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import { MissionProgressEngine } from '../missions/mission-progress.engine.js';
import { ChallengeProgressEngine } from '../challenges/challenge-progress.engine.js';
import {
  MissionDefinition, ChallengeDefinition, MissionCompletion, ProgressRewardClaim,
} from './definition.entity.js';
import { rows, text } from './sql.js';
import type { RewardClaimDto } from './progress.dto.js';

export async function lockVolunteer(manager: EntityManager, userId: string): Promise<User> {
  const user = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
  if (!user || user.status !== UserStatus.ACTIVE || !user.roles.includes(Role.VOLUNTEER))
    throw new DomainError(403, 'FORBIDDEN', 'Потрібен активний обліковий запис волонтера.');
  return user;
}
export function claimView(claim: ProgressRewardClaim): RewardClaimDto {
  return {
    id: claim.id, kind: claim.kind, definitionId: claim.definitionId,
    xp: claim.xp, rewardPoints: claim.rewardPoints, achievement: claim.achievement,
    claimedAt: claim.claimedAt.toISOString(),
  };
}
@Injectable()
export class RewardClaimsService {
  constructor(
    private readonly transactions: Transactions,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly missions: MissionProgressEngine,
    private readonly challenges: ChallengeProgressEngine,
  ) {}

  claim(userId: string, kind: 'mission' | 'challenge', id: string): Promise<RewardClaimDto> {
    return this.transactions.run(async (manager) => {
      // Serializes all claims and verifications for this recipient, including retries.
      await lockVolunteer(manager, userId);
      const old = await manager.findOneBy(ProgressRewardClaim, { userId, kind, definitionId: id });
      if (old) return claimView(old);
      // Always acquire challenge locks in UUID order, never target-first then all.
      if (kind === 'challenge') await this.challenges.reconcileAll(manager);
      const definition = kind === 'mission'
        ? await manager.findOne(MissionDefinition, { where: { id }, lock: { mode: 'for_no_key_update' } })
        : await manager.findOne(ChallengeDefinition, { where: { id }, lock: { mode: 'for_no_key_update' } });
      if (!definition || definition.status === 'DRAFT')
        throw new DomainError(404, 'NOT_FOUND', 'Визначення не знайдено.');
      let evidenceIds: string[];
      if (definition instanceof MissionDefinition) {
        const context = await this.missions.context(manager, userId);
        const progress = this.missions.calculate(definition, userId, context);
        if (progress.status !== 'COMPLETED')
          throw new DomainError(409, 'MISSION_NOT_COMPLETE', 'Спочатку виконай умови місії.');
        await this.missions.reconcileUser(manager, userId);
        const completion = await manager.findOneBy(MissionCompletion, { userId, missionId: id });
        if (!completion) throw new DomainError(409, 'PROGRESS_INCONSISTENT', 'Відсутнє підтвердження місії.');
        evidenceIds = completion.evidenceIds;
      } else {
        const progress = await this.challenges.calculate(manager, definition);
        const own = await this.challenges.ownContribution(manager, id, userId);
        if (!progress.complete || own.ownQuests === 0)
          throw new DomainError(409, 'CHALLENGE_NOT_COMPLETE', 'Потрібні виконані спільні цілі та власний підтверджений внесок.');
        evidenceIds = rows(await manager.query(
          `SELECT verified_activity_id AS id FROM challenge_contributions WHERE challenge_id=$1
           UNION SELECT measurement_id FROM challenge_contributions WHERE challenge_id=$1 AND measurement_id IS NOT NULL
           UNION SELECT source_verified_activity_id FROM challenge_eligible_activities WHERE challenge_id=$1 AND participant_user_id=$2
           ORDER BY id`, [id, userId],
        )).map((row) => text(row.id));
      }
      const claim = await manager.save(ProgressRewardClaim, manager.create(ProgressRewardClaim, {
        userId, kind, definitionId: id, xp: definition.rewardXp, rewardPoints: definition.rewardPoints,
        achievement: definition.achievement, evidenceIds,
      }));
      await this.ledger.awardProgress(manager, userId, kind, definition);
      await this.audit.record(manager, userId, 'PROGRESS_REWARD_CLAIMED', kind, id, {
        claimId: claim.id, xp: claim.xp, rewardPoints: claim.rewardPoints,
      });
      // Bonus XP can satisfy a later mission's minimum-level prerequisite.
      await this.missions.reconcileUser(manager, userId);
      return claimView(claim);
    });
  }
}
