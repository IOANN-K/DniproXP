import 'reflect-metadata';
import { z } from 'zod';
import dataSource from './data-source.js';
import { User } from './entities/user.entity.js';
import { UserPreferences } from './entities/preferences.entity.js';
import {
  Organization,
  OrganizationMembership,
} from './entities/organization.entity.js';
import {
  Role,
  UserStatus,
  ModerationStatus,
  MembershipStatus,
  StaffRole,
} from './entities/domain.js';
import { PasswordService } from '../auth/password.service.js';
import { AuditService } from '../audit/audit.service.js';

import { seedQuestEngine } from './quest-seed.js';

const credential = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(16).max(128),
});
const config = z.object({
  ALLOW_DEMO_SEED: z.literal('true'),
  NODE_ENV: z.enum(['development', 'test']),
  SEED_VOLUNTEER: credential,
  SEED_VOLUNTEER_2: credential,
  SEED_ORGANIZER: credential,
  SEED_ORGANIZER_2: credential,
  SEED_ADMIN: credential,
});
async function seed(): Promise<void> {
  const read = (name: string) => ({
    email: process.env[`${name}_EMAIL`],
    password: process.env[`${name}_PASSWORD`],
  });
  const parsed = config.safeParse({
    ALLOW_DEMO_SEED: process.env.ALLOW_DEMO_SEED,
    NODE_ENV: process.env.NODE_ENV,
    SEED_VOLUNTEER: read('SEED_VOLUNTEER'),
    SEED_VOLUNTEER_2: read('SEED_VOLUNTEER_2'),
    SEED_ORGANIZER: read('SEED_ORGANIZER'),
    SEED_ORGANIZER_2: read('SEED_ORGANIZER_2'),
    SEED_ADMIN: read('SEED_ADMIN'),
  });
  if (!parsed.success)
    throw new Error(
      'Seed requires development/test, explicit ALLOW_DEMO_SEED=true and five distinct ENV email/password pairs (password >=16 characters).',
    );
  const input = parsed.data;
  const definitions = [
    {
      key: 'volunteer',
      name: 'Олександра Коваль',
      role: Role.VOLUNTEER,
      ...input.SEED_VOLUNTEER,
    },
    {
      key: 'volunteer-2',
      name: 'Максим Бондар',
      role: Role.VOLUNTEER,
      ...input.SEED_VOLUNTEER_2,
    },
    {
      key: 'organizer',
      name: 'Координатор «Зелений Дніпро»',
      role: Role.ORGANIZER,
      ...input.SEED_ORGANIZER,
    },
    {
      key: 'organizer-2',
      name: 'Координатор «Поруч»',
      role: Role.ORGANIZER,
      ...input.SEED_ORGANIZER_2,
    },
    {
      key: 'admin',
      name: 'Адміністратор DniproXP',
      role: Role.ADMIN,
      ...input.SEED_ADMIN,
    },
  ];
  if (new Set(definitions.map((d) => d.email)).size !== definitions.length)
    throw new Error('Seed emails must be distinct.');
  const passwordService = new PasswordService();
  const audit = new AuditService();
  // Argon2 work occurs before acquiring transaction locks. Existing passwords are never overwritten.
  const hashes = await Promise.all(
    definitions.map((d) => passwordService.hash(d.password)),
  );
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtext('dniproxp:foundation-demo-seed:v1'))",
      );
      const ids = new Map<string, string>();
      for (const [index, definition] of definitions.entries()) {
        const key = `be01:${definition.key}`;
        const existing = await manager
          .createQueryBuilder(User, 'user')
          .addSelect('user.seedKey')
          .where('user.email = :email OR user.seedKey = :key', {
            email: definition.email,
            key,
          })
          .getMany();
        const old = existing[0];
        if (
          existing.length > 1 ||
          (old &&
            (old.seedKey !== key ||
              old.email !== definition.email ||
              old.status !== UserStatus.ACTIVE ||
              !old.roles.includes(definition.role)))
        )
          throw new Error(
            'Seed identity collision or changed account; refusing to modify existing data.',
          );
        let user = old;
        if (!user) {
          const passwordHash = hashes[index];
          if (!passwordHash) throw new Error('Missing seed password hash');
          user = await manager.save(
            User,
            manager.create(User, {
              email: definition.email,
              passwordHash,
              displayName: definition.name,
              roles:
                definition.role === Role.VOLUNTEER
                  ? [Role.VOLUNTEER]
                  : [Role.VOLUNTEER, definition.role],
              primaryRole: definition.role,
              status: UserStatus.ACTIVE,
              avatarUrl: null,
              bio: null,
              lastLoginAt: null,
              seedKey: key,
            }),
          );
          await manager.save(
            UserPreferences,
            manager.create(UserPreferences, { userId: user.id }),
          );
          await audit.record(
            manager,
            user.id,
            'DEMO_USER_CREATED',
            'user',
            user.id,
            { role: definition.role },
          );
        }
        if (!(await manager.existsBy(UserPreferences, { userId: user.id })))
          throw new Error(
            'Existing seed account has no preferences; refusing implicit repair.',
          );
        ids.set(definition.key, user.id);
      }
      const adminId = ids.get('admin');
      if (!adminId) throw new Error('Missing admin seed identity');
      const organizations = [
        {
          slug: 'zelenyi-dnipro-demo',
          name: 'Зелений Дніпро',
          owner: 'organizer',
          status: ModerationStatus.APPROVED,
        },
        {
          slug: 'poruch-demo',
          name: 'Поруч',
          owner: 'organizer-2',
          status: ModerationStatus.PENDING,
        },
        {
          slug: 'virnyi-druh-demo',
          name: 'Вірний друг',
          owner: 'organizer-2',
          status: ModerationStatus.REJECTED,
        },
        {
          slug: 'spilni-dii-demo',
          name: 'Місто спільних дій',
          owner: 'organizer',
          status: ModerationStatus.SUSPENDED,
        },
      ];
      const organizationIds = new Map<string, string>();
      for (const definition of organizations) {
        const ownerId = ids.get(definition.owner);
        if (!ownerId) throw new Error('Missing seed organization owner');
        const key = `be01:${definition.slug}`;
        const existing = await manager
          .createQueryBuilder(Organization, 'org')
          .addSelect('org.seedKey')
          .where('org.slug = :slug OR org.seedKey = :key', {
            slug: definition.slug,
            key,
          })
          .getMany();
        const old = existing[0];
        if (
          existing.length > 1 ||
          (old && (old.seedKey !== key || old.slug !== definition.slug))
        )
          throw new Error(
            'Seed organization collision; refusing to modify existing data.',
          );
        let org = old;
        if (!org) {
          org = await manager.save(
            Organization,
            manager.create(Organization, {
              name: definition.name,
              slug: definition.slug,
              description:
                'Демонстраційна організація для локального сценарію DniproXP. Не є реальною партнерською пропозицією.',
              logoUrl: null,
              websiteUrl: null,
              moderationStatus: definition.status,
              moderationReason: [
                ModerationStatus.REJECTED,
                ModerationStatus.SUSPENDED,
              ].includes(definition.status)
                ? 'Демонстраційний стан для перевірки обмежень доступу.'
                : null,
              seedKey: key,
            }),
          );
          const member = await manager.save(
            OrganizationMembership,
            manager.create(OrganizationMembership, {
              organizationId: org.id,
              userId: ownerId,
              role: StaffRole.OWNER,
              status: MembershipStatus.ACTIVE,
            }),
          );
          await audit.record(
            manager,
            adminId,
            'DEMO_ORGANIZATION_CREATED',
            'organization',
            org.id,
            { moderationStatus: org.moderationStatus },
          );
          await audit.record(
            manager,
            adminId,
            'ORGANIZATION_MEMBER_ADDED',
            'organization_membership',
            member.id,
            { userId: ownerId, organizationId: org.id, role: StaffRole.OWNER },
          );
        } else if (
          !(await manager.existsBy(OrganizationMembership, {
            organizationId: org.id,
            role: StaffRole.OWNER,
            status: MembershipStatus.ACTIVE,
          }))
        )
          throw new Error(
            'Existing seed organization has no owner; refusing implicit repair.',
          );
        organizationIds.set(definition.slug, org.id);
      }
      await seedQuestEngine(manager, dataSource, ids, organizationIds);
    });
    console.log(
      'Demo seed completed. Existing profiles, memberships, preferences and passwords were preserved.',
    );
  } finally {
    await dataSource.destroy();
  }
}
void seed().catch(() => {
  console.error(
    'Seed failed; transaction rolled back. Check explicit seed ENV, collisions and database migration status. No credentials were logged.',
  );
  process.exitCode = 1;
});
