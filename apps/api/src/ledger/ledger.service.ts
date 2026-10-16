import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { DomainError } from '../common/http.js';
import { RewardLedger } from './ledger.entity.js';
import { Currency, LedgerType } from '../quests/domain.js';
import type { Quest } from '../quests/quest.entity.js';
import type { Participation } from '../participations/participation.entity.js';
import type {
  LedgerQueryDto,
  LedgerEntryDto,
  LedgerPageDto,
  ProgressionDto,
} from './ledger.dto.js';
import { progressionFor } from './levels.js';
export function ledgerView(row: RewardLedger): LedgerEntryDto {
  return {
    id: row.id,
    currency: row.currency,
    amount: row.amount,
    transactionType: row.transactionType,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    idempotencyKey: row.idempotencyKey,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}
function safeNumber(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new DomainError(
      503,
      'STATISTICS_UNAVAILABLE',
      'Статистика недоступна.',
    );
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new DomainError(
      503,
      'STATISTICS_OUT_OF_RANGE',
      'Значення статистики поза допустимим діапазоном.',
    );
  return number;
}
@Injectable()
export class LedgerService {
  constructor(private readonly source: DataSource) {}
  private async append(
    manager: EntityManager,
    input: {
      userId: string;
      currency: Currency;
      amount: number;
      transactionType: LedgerType;
      sourceType: string;
      sourceId: string;
      idempotencyKey: string;
      metadata: RewardLedger['metadata'];
    },
  ): Promise<RewardLedger> {
    if (!manager.queryRunner?.isTransactionActive)
      throw new Error('Ledger writes require an active transaction');
    if (
      !Number.isSafeInteger(input.amount) ||
      Math.abs(input.amount) > 2147483647
    )
      throw new DomainError(
        422,
        'INVALID_AMOUNT',
        'Некоректна сума транзакції.',
      );
    const user = await manager.findOne(User, {
      where: { id: input.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user)
      throw new DomainError(404, 'NOT_FOUND', 'Користувача не знайдено.');
    const old = await manager.findOneBy(RewardLedger, {
      idempotencyKey: input.idempotencyKey,
    });
    if (old) {
      const metadataMatches = Object.keys({
        ...old.metadata,
        ...input.metadata,
      }).every((key) => old.metadata[key] === input.metadata[key]);
      if (
        old.userId !== input.userId ||
        old.currency !== input.currency ||
        old.amount !== input.amount ||
        old.sourceId !== input.sourceId ||
        old.sourceType !== input.sourceType ||
        old.transactionType !== input.transactionType ||
        !metadataMatches
      )
        throw new DomainError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Ключ уже використано для іншої операції.',
        );
      return old;
    }
    if (input.currency === Currency.XP && input.amount < 0)
      throw new DomainError(422, 'XP_IS_CUMULATIVE', 'XP не можна списувати.');
    if (input.currency === Currency.REWARD_POINTS && input.amount < 0) {
      const balance = await this.readProgression(manager, input.userId);
      if (balance.rewardPointsBalance + input.amount < 0)
        throw new DomainError(
          409,
          'INSUFFICIENT_POINTS',
          'Недостатньо бонусних балів.',
        );
    }
    return manager.save(RewardLedger, manager.create(RewardLedger, input));
  }
  async awardQuest(
    manager: EntityManager,
    quest: Quest,
    participation: Participation,
  ): Promise<RewardLedger[]> {
    const entries: RewardLedger[] = [];
    for (const [currency, amount] of [
      [Currency.XP, quest.xp],
      [Currency.REWARD_POINTS, quest.rewardPoints],
    ] satisfies [Currency, number][]) {
      entries.push(
        await this.append(manager, {
          userId: participation.userId,
          currency,
          amount,
          transactionType: LedgerType.QUEST_COMPLETION,
          sourceType: 'participation',
          sourceId: participation.id,
          idempotencyKey: `completion:${participation.userId}:${quest.id}:${currency}`,
          metadata: { questId: quest.id, organizationId: quest.organizationId },
        }),
      );
    }
    return entries;
  }
  // Internal transaction API for BE-05. No HTTP endpoint can choose arbitrary amounts.
  spendPoints(
    manager: EntityManager,
    userId: string,
    amount: number,
    redemptionId: string,
    idempotencyKey: string,
  ): Promise<RewardLedger> {
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new DomainError(
        422,
        'INVALID_AMOUNT',
        'Вартість має бути додатним цілим числом.',
      );
    return this.append(manager, {
      userId,
      currency: Currency.REWARD_POINTS,
      amount: -amount,
      transactionType: LedgerType.REDEMPTION,
      sourceType: 'redemption',
      sourceId: redemptionId,
      idempotencyKey,
      metadata: {},
    });
  }
  async compensate(
    manager: EntityManager,
    originalId: string,
    amount: number,
    operationId: string,
    idempotencyKey: string,
    reason: string,
  ): Promise<RewardLedger> {
    const original = await manager.findOneBy(RewardLedger, { id: originalId });
    if (!original)
      throw new DomainError(404, 'NOT_FOUND', 'Транзакцію не знайдено.');
    if (reason.trim().length < 5 || reason.length > 1000)
      throw new DomainError(
        422,
        'REASON_REQUIRED',
        'Вкажи причину коригування.',
      );
    return this.append(manager, {
      userId: original.userId,
      currency: original.currency,
      amount,
      transactionType: LedgerType.COMPENSATION,
      sourceType: 'compensation',
      sourceId: operationId,
      idempotencyKey,
      metadata: { originalId, reason: reason.trim() },
    });
  }
  async readProgression(
    manager: EntityManager,
    userId: string,
  ): Promise<ProgressionDto> {
    const rows: unknown = await manager.query(
      `SELECT COALESCE(SUM(amount) FILTER(WHERE currency='XP'),0)::text AS xp,
      COALESCE(SUM(amount) FILTER(WHERE currency='REWARD_POINTS'),0)::text AS points,
      (SELECT count(*)::text FROM verified_activities WHERE user_id=$1) AS quests,
      (SELECT sum(verified_minutes)::text FROM verified_activities WHERE user_id=$1) AS minutes,
      (SELECT count(*)::text FROM verified_activities WHERE user_id=$1 AND verified_minutes IS NULL) AS unknown_minutes
      FROM reward_ledger WHERE user_id=$1`,
      [userId],
    );
    const row: unknown = Array.isArray(rows) ? rows[0] : undefined;
    if (
      typeof row !== 'object' ||
      row === null ||
      !('xp' in row) ||
      !('points' in row) ||
      !('quests' in row) ||
      !('minutes' in row) ||
      !('unknown_minutes' in row)
    )
      throw new DomainError(
        503,
        'STATISTICS_UNAVAILABLE',
        'Статистика недоступна.',
      );
    const totalXP = safeNumber(row.xp),
      verifiedQuestsCount = safeNumber(row.quests);
    return {
      totalXP,
      rewardPointsBalance: safeNumber(row.points),
      ...progressionFor(totalXP),
      verifiedQuestsCount,
      verifiedMinutes:
        row.minutes === null
          ? verifiedQuestsCount === 0
            ? 0
            : null
          : safeNumber(row.minutes),
      unknownMinutesCount: safeNumber(row.unknown_minutes),
    };
  }
  progression(userId: string): Promise<ProgressionDto> {
    return this.readProgression(this.source.manager, userId);
  }
  async transactions(
    userId: string,
    input: LedgerQueryDto,
  ): Promise<LedgerPageDto> {
    const query = this.source.manager
      .createQueryBuilder(RewardLedger, 'entry')
      .where('entry.userId=:userId', { userId });
    if (input.currency)
      query.andWhere('entry.currency=:currency', { currency: input.currency });
    const [rows, total] = await query
      .orderBy('entry.createdAt', input.order)
      .addOrderBy('entry.id', input.order)
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(ledgerView),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  }
}
