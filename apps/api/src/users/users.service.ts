import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { UserPreferences } from '../database/entities/preferences.entity.js';
import { UserStatus } from '../database/entities/domain.js';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/http.js';
import { preferences, privateUser } from './projections.js';
import type {
  UpdateUserDto,
  UpdatePreferencesDto,
  PublicUserProfileDto,
  PreferencesDto,
  UserDto,
} from './users.dto.js';
@Injectable()
export class UsersService {
  constructor(
    private readonly source: DataSource,
    private readonly transactions: Transactions,
    private readonly audit: AuditService,
  ) {}
  async update(userId: string, input: UpdateUserDto): Promise<UserDto> {
    return this.transactions.run(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId, status: UserStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user)
        throw new DomainError(
          401,
          'UNAUTHENTICATED',
          'Обліковий запис недоступний.',
        );
      if (input.primaryRole && !user.roles.includes(input.primaryRole))
        throw new DomainError(
          403,
          'FORBIDDEN',
          'Цю роль не призначено обліковому запису.',
        );
      const previousRole = user.primaryRole;
      if (input.displayName !== undefined) user.displayName = input.displayName;
      if (input.bio !== undefined) user.bio = input.bio;
      if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
      if (input.primaryRole !== undefined) user.primaryRole = input.primaryRole;
      await manager.save(user);
      await this.audit.record(
        manager,
        userId,
        'PROFILE_UPDATED',
        'user',
        userId,
      );
      if (user.primaryRole !== previousRole)
        await this.audit.record(
          manager,
          userId,
          'PRIMARY_ROLE_CHANGED',
          'user',
          userId,
          { previousRole, primaryRole: user.primaryRole },
        );
      return privateUser(user);
    });
  }
  async getPreferences(userId: string): Promise<PreferencesDto> {
    const value = await this.source.manager.findOneBy(UserPreferences, {
      userId,
    });
    if (!value)
      throw new DomainError(
        503,
        'PREFERENCES_UNAVAILABLE',
        'Налаштування тимчасово недоступні.',
      );
    return preferences(value);
  }
  async updatePreferences(
    userId: string,
    input: UpdatePreferencesDto,
  ): Promise<PreferencesDto> {
    return this.transactions.run(async (manager) => {
      const value = await manager.findOne(UserPreferences, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!value)
        throw new DomainError(
          503,
          'PREFERENCES_UNAVAILABLE',
          'Налаштування тимчасово недоступні.',
        );
      Object.assign(value, input);
      await manager.save(value);
      await this.audit.record(
        manager,
        userId,
        'PRIVACY_UPDATED',
        'user',
        userId,
      );
      return preferences(value);
    });
  }
  async publicProfile(id: string): Promise<PublicUserProfileDto> {
    const user = await this.source.manager.findOneBy(User, {
      id,
      status: UserStatus.ACTIVE,
    });
    const prefs = user
      ? await this.source.manager.findOneBy(UserPreferences, { userId: id })
      : null;
    // Absent, inactive and private accounts have the same privacy-safe projection.
    if (!user || !prefs?.publicProfile) return { restricted: true };
    return {
      restricted: false,
      id: user.id,
      joinDate: user.createdAt.toISOString(),
      statistics: { available: false },
      ...(prefs.showDisplayName
        ? {
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
          }
        : {}),
    };
  }
}
