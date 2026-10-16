import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { MissionProgressEngine } from '../missions/mission-progress.engine.js';
import { ChallengeProgressEngine } from '../challenges/challenge-progress.engine.js';

/** Synchronous projections in the verification transaction; failure rolls back the source too. */
@Injectable()
export class VerifiedProgressService {
  constructor(
    private readonly missions: MissionProgressEngine,
    private readonly challenges: ChallengeProgressEngine,
  ) {}

  async process(manager: EntityManager, userId: string): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive)
      throw new Error('Verified progress requires an active transaction');
    // Verification already holds the recipient's user lock, acquired by LedgerService.
    await this.missions.reconcileUser(manager, userId);
    await this.challenges.reconcileAll(manager);
  }
}
