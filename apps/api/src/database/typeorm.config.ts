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
    ],
    migrations: [Foundation1792108800000],
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
