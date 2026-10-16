import { ImpactEvent, ImpactReceipt, CollectiveMeasurement } from '../impact/impact.entity.js';
import { MissionDefinition, ChallengeDefinition, MissionEnrollment, MissionCompletion, ProgressRewardClaim, ChallengeParticipant, ChallengeMilestoneCompletion } from '../progress/definition.entity.js';
import { VerifiedProgress1792281600000 } from './migrations/1792281600000-verified-progress.js';
import type { DataSourceOptions } from 'typeorm';
import type { Environment } from '../config/environment.js';
import { User } from './entities/user.entity.js';
import { UserPreferences } from './entities/preferences.entity.js';
import {
  Organization,
  OrganizationMembership,
} from './entities/organization.entity.js';
import { AuthSession, RefreshToken } from './entities/session.entity.js';
import { AuditLog } from './entities/audit.entity.js';
import { Foundation1792108800000 } from './migrations/1792108800000-foundation.js';
import { Quest } from '../quests/quest.entity.js';
import {
  QuestApplication,
  Participation,
  ParticipationReport,
} from '../participations/participation.entity.js';
import { RewardLedger, VerifiedActivity } from '../ledger/ledger.entity.js';
import { QuestEngine1792195200000 } from './migrations/1792195200000-quest-engine.js';
export function databaseOptions(env: Environment): DataSourceOptions {
  return {
    type: 'postgres',
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    ...(env.DATABASE_URL
      ? { url: env.DATABASE_URL }
      : {
          host: env.DB_HOST,
          port: env.DB_PORT,
          username: env.DB_USER,
          password: env.DB_PASSWORD,
          database: env.DB_NAME,
        }),
    ssl:
      env.DB_SSL === 'true'
        ? {
            rejectUnauthorized: true,
            ...(env.DB_SSL_CA
              ? { ca: env.DB_SSL_CA.replace(/\\n/g, '\n') }
              : {}),
          }
        : false,
    entities: [
      User,
      UserPreferences,
      Organization,
      OrganizationMembership,
      AuthSession,
      RefreshToken,
      AuditLog,
      Quest,
      QuestApplication,
      Participation,
      ParticipationReport,
      RewardLedger,
      VerifiedActivity,
      ImpactEvent, ImpactReceipt, CollectiveMeasurement,
      MissionDefinition, ChallengeDefinition, MissionEnrollment, MissionCompletion, ProgressRewardClaim, ChallengeParticipant, ChallengeMilestoneCompletion,
    ],
    migrations: [Foundation1792108800000, QuestEngine1792195200000, VerifiedProgress1792281600000],
    migrationsTableName: 'api_migrations',
    migrationsRun: false,
    synchronize: false,
    dropSchema: false,
    logging: false,
    extra: {
      options:
        '-c timezone=UTC -c statement_timeout=10000 -c idle_in_transaction_session_timeout=15000',
      max: 10,
      connectionTimeoutMillis: 5000,
    },
  };
}
