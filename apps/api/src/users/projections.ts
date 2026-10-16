import type { User } from '../database/entities/user.entity.js';
import type { UserPreferences } from '../database/entities/preferences.entity.js';
import type { PreferencesDto, UserDto } from './users.dto.js';
export function privateUser(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
    roles: [...user.roles],
    primaryRole: user.primaryRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    statistics: { available: false },
  };
}
export function preferences(value: UserPreferences): PreferencesDto {
  return {
    publicProfile: value.publicProfile,
    showDisplayName: value.showDisplayName,
    showActivityHistory: value.showActivityHistory,
    showTeams: value.showTeams,
    showVerifiedHours: value.showVerifiedHours,
    showAchievements: value.showAchievements,
    showSkillProgress: value.showSkillProgress,
    showOrganizations: value.showOrganizations,
  };
}
