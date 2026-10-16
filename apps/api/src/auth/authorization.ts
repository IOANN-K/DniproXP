import { Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { AuthSession } from '../database/entities/session.entity.js';
import { UserStatus } from '../database/entities/domain.js';
import type { Role } from '../database/entities/domain.js';
import { DomainError } from '../common/http.js';
import type { ApiRequest, Principal } from '../common/http.js';
import { TokenService } from './token.service.js';
export const Roles = (...roles: Role[]) => SetMetadata('requiredRoles', roles);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal => {
    const value = context.switchToHttp().getRequest<ApiRequest>().principal;
    if (!value)
      throw new DomainError(401, 'UNAUTHENTICATED', 'Потрібно увійти.');
    return value;
  },
);
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly source: DataSource,
    private readonly tokens: TokenService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ') || authorization.length > 4096)
      throw new DomainError(401, 'UNAUTHENTICATED', 'Потрібно увійти.');
    const claims = await this.tokens.verify('access', authorization.slice(7));
    const session = await this.source.manager.findOne(AuthSession, {
      where: {
        id: claims.sessionId,
        userId: claims.userId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    const user = session
      ? await this.source.manager.findOne(User, {
          where: { id: claims.userId, status: UserStatus.ACTIVE },
        })
      : null;
    if (!user)
      throw new DomainError(
        401,
        'UNAUTHENTICATED',
        'Сесія недійсна або завершилася.',
      );
    request.principal = { user, sessionId: claims.sessionId };
    return true;
  }
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>('requiredRoles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const principal = context.switchToHttp().getRequest<ApiRequest>().principal;
    if (
      roles?.length &&
      !roles.some((role) => principal?.user.roles.includes(role))
    )
      throw new DomainError(403, 'FORBIDDEN', 'Недостатньо повноважень.');
    return true;
  }
}
