import type { EntityManager } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { UserPreferences } from '../database/entities/preferences.entity.js';
import { UserStatus } from '../database/entities/domain.js';
import { DomainError } from '../common/http.js';
export async function identityProfile(manager: EntityManager,userId: string) {
  const user = await manager.findOneBy(User,{ id: userId,status: UserStatus.ACTIVE });
  const preferences = user ? await manager.findOneBy(UserPreferences,{ userId }) : null;
  if (!user || !preferences) return null;
  return { user,preferences };
}
export async function requireIdentity(manager: EntityManager,userId: string) {
  const result = await identityProfile(manager,userId);
  if (!result) throw new DomainError(404,'NOT_FOUND','Профіль недоступний.');return result;
}
