import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, IsNull } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { UserPreferences } from '../database/entities/preferences.entity.js';
import {
  AuthSession,
  RefreshToken,
} from '../database/entities/session.entity.js';
import { Role, UserStatus } from '../database/entities/domain.js';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { Settings } from '../config/settings.js';
import { DomainError } from '../common/http.js';
import { privateUser } from '../users/projections.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import type { LoginDto, RegisterDto, AuthResponseDto } from './auth.dto.js';
type IssuedSession = {
  body: AuthResponseDto;
  refreshToken: string;
  refreshExpiresAt: Date;
};
@Injectable()
export class AuthService {
  constructor(
    private readonly source: DataSource,
    private readonly transactions: Transactions,
    private readonly audit: AuditService,
    private readonly settings: Settings,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}
  private invalid(): DomainError {
    return new DomainError(
      401,
      'UNAUTHENTICATED',
      'Неправильні облікові дані або сесія недійсна.',
    );
  }
  private async issue(
    manager: EntityManager,
    user: User,
    session: AuthSession,
  ): Promise<IssuedSession> {
    const remaining = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000,
    );
    if (remaining < 1) throw this.invalid();
    const tokenId = randomUUID();
    const expiresIn = Math.min(this.settings.values.JWT_ACCESS_TTL, remaining);
    const refreshToken = await this.tokens.sign(
      'refresh',
      { userId: user.id, sessionId: session.id, tokenId },
      remaining,
    );
    await manager.save(
      RefreshToken,
      manager.create(RefreshToken, {
        id: tokenId,
        sessionId: session.id,
        verifier: this.tokens.verifier(refreshToken),
        expiresAt: session.expiresAt,
        consumedAt: null,
      }),
    );
    return {
      body: {
        accessToken: await this.tokens.sign(
          'access',
          { userId: user.id, sessionId: session.id, tokenId: randomUUID() },
          expiresIn,
        ),
        tokenType: 'Bearer',
        expiresIn,
        user: privateUser(user),
      },
      refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }
  private async start(
    manager: EntityManager,
    user: User,
  ): Promise<IssuedSession> {
    const session = await manager.save(
      AuthSession,
      manager.create(AuthSession, {
        userId: user.id,
        expiresAt: new Date(
          Date.now() + this.settings.values.JWT_REFRESH_TTL * 1000,
        ),
        revokedAt: null,
      }),
    );
    return this.issue(manager, user, session);
  }
  async register(input: RegisterDto): Promise<IssuedSession> {
    const passwordHash = await this.passwords.hash(input.password);
    return this.transactions.run(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          avatarUrl: null,
          bio: null,
          status: UserStatus.ACTIVE,
          roles: [Role.VOLUNTEER],
          primaryRole: Role.VOLUNTEER,
          lastLoginAt: new Date(),
        }),
      );
      await manager.save(
        UserPreferences,
        manager.create(UserPreferences, { userId: user.id }),
      );
      await this.audit.record(
        manager,
        user.id,
        'USER_REGISTERED',
        'user',
        user.id,
      );
      return this.start(manager, user);
    });
  }
  async login(input: LoginDto): Promise<IssuedSession> {
    const found = await this.source.manager
      .createQueryBuilder(User, 'user')
      .addSelect('user.passwordHash')
      .where('lower(user.email) = :email', { email: input.email })
      .getOne();
    const valid = await this.passwords.matches(
      found?.passwordHash,
      input.password,
    );
    if (!found || !valid || found.status !== UserStatus.ACTIVE) {
      await this.audit.record(
        this.source.manager,
        null,
        'LOGIN_REJECTED',
        'user',
        found?.id ?? null,
      );
      throw this.invalid();
    }
    return this.transactions.run(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: found.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || user.status !== UserStatus.ACTIVE) throw this.invalid();
      user.lastLoginAt = new Date();
      await manager.save(user);
      await this.audit.record(
        manager,
        user.id,
        'LOGIN_SUCCEEDED',
        'user',
        user.id,
      );
      return this.start(manager, user);
    });
  }
  async refresh(token: string | undefined): Promise<IssuedSession> {
    if (!token) throw this.invalid();
    const claims = await this.tokens.verify('refresh', token);
    const result = await this.transactions.run(async (manager) => {
      // Consistent lock order: user, session, token. Serializes refresh vs logout-all.
      const user = await manager.findOne(User, {
        where: { id: claims.userId },
        lock: { mode: 'pessimistic_write' },
      });
      const session = await manager.findOne(AuthSession, {
        where: { id: claims.sessionId, userId: claims.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !user ||
        !session ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now()
      )
        return null;
      const stored = await manager.findOne(RefreshToken, {
        where: { id: claims.tokenId, sessionId: session.id },
      });
      if (!stored || !this.tokens.matches(token, stored.verifier)) return null;
      if (stored.consumedAt || user.status !== UserStatus.ACTIVE) {
        session.revokedAt = new Date();
        await manager.save(session);
        await this.audit.record(
          manager,
          user.id,
          stored.consumedAt
            ? 'REFRESH_REUSE_DETECTED'
            : 'INACTIVE_USER_SESSION_REVOKED',
          'auth_session',
          session.id,
        );
        return null; // Commit revocation before returning 401 outside the transaction.
      }
      if (stored.expiresAt.getTime() <= Date.now()) return null;
      stored.consumedAt = new Date();
      await manager.save(stored);
      await this.audit.record(
        manager,
        user.id,
        'SESSION_REFRESHED',
        'auth_session',
        session.id,
      );
      return this.issue(manager, user, session);
    });
    if (!result) throw this.invalid();
    return result;
  }
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    // Invalid/expired tokens are already unusable; cookie is cleared by controller.
    const claims = await this.tokens.verify('refresh', token).catch(() => null);
    if (!claims) return;
    await this.transactions.run(async (manager) => {
      await manager.findOne(User, {
        where: { id: claims.userId },
        lock: { mode: 'pessimistic_write' },
      });
      const session = await manager.findOne(AuthSession, {
        where: { id: claims.sessionId, userId: claims.userId },
        lock: { mode: 'pessimistic_write' },
      });
      const stored = session
        ? await manager.findOne(RefreshToken, {
            where: { id: claims.tokenId, sessionId: session.id },
          })
        : null;
      if (
        session &&
        stored &&
        !session.revokedAt &&
        this.tokens.matches(token, stored.verifier)
      ) {
        session.revokedAt = new Date();
        await manager.save(session);
        await this.audit.record(
          manager,
          claims.userId,
          'SESSION_LOGGED_OUT',
          'auth_session',
          session.id,
        );
      }
    });
  }
  async logoutAll(userId: string): Promise<void> {
    await this.transactions.run(async (manager) => {
      await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      await manager.update(
        AuthSession,
        { userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      await this.audit.record(
        manager,
        userId,
        'ALL_SESSIONS_REVOKED',
        'user',
        userId,
      );
    });
  }
}
