import { Injectable, SetMetadata } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { Settings } from '../config/settings.js';
import { DomainError } from '../common/http.js';
type RatePolicy = { action: string; limit: number; seconds: number };
export const RateLimit = (action: string, limit: number, seconds: number) =>
  SetMetadata('authRateLimit', { action, limit, seconds } satisfies RatePolicy);
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly source: DataSource,
    private readonly settings: Settings,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<RatePolicy>(
      'authRateLimit',
      [context.getHandler(), context.getClass()],
    );
    if (!policy) return true;
    const req = context.switchToHttp().getRequest<Request>();
    // Shared PostgreSQL buckets work across API instances. Do not trust forwarded IPs unless explicitly configured.
    const key = createHmac('sha256', this.settings.values.JWT_ACCESS_SECRET)
      .update(
        `${policy.action}:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`,
      )
      .digest('hex');
    const rows: unknown = await this.source.query(
      `INSERT INTO auth_rate_limits(key,hits,resets_at) VALUES ($1,1,now()+$2*interval '1 second')
      ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_rate_limits.resets_at <= now() THEN 1 ELSE LEAST(auth_rate_limits.hits,1000000)+1 END,
      resets_at=CASE WHEN auth_rate_limits.resets_at <= now() THEN EXCLUDED.resets_at ELSE auth_rate_limits.resets_at END
      RETURNING hits, GREATEST(1,ceil(extract(epoch FROM resets_at-now())))::integer AS retry`,
      [key, policy.seconds],
    );
    if (!Array.isArray(rows)) throw new Error('Unexpected rate limit result');
    const first: unknown = rows[0];
    if (
      typeof first !== 'object' ||
      first === null ||
      !('hits' in first) ||
      typeof first.hits !== 'number' ||
      !('retry' in first) ||
      typeof first.retry !== 'number'
    )
      throw new Error('Unexpected rate limit row');
    if (first.hits > policy.limit)
      throw new DomainError(
        429,
        'RATE_LIMITED',
        'Забагато спроб. Спробуй пізніше.',
        { retryAfterSeconds: first.retry },
      );
    return true;
  }
}
