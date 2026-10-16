import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
/** The same durable PostgreSQL evaluator is called by verification/claim triggers and migration backfill. */
@Injectable()
export class AchievementEvaluator {
  async recompute(manager: EntityManager,userId: string | null,teamId: string | null = null): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Achievement evaluation requires a transaction');
    await manager.query('SELECT dniproxp_evaluate_identity($1::uuid,$2::uuid)',[userId,teamId]);
  }
}
