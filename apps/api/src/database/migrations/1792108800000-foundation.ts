import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Foundation1792108800000 implements MigrationInterface {
  name = 'Foundation1792108800000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(254) NOT NULL,
        password_hash text NOT NULL,
        display_name varchar(80) NOT NULL,
        avatar_url text, bio text,
        status varchar NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DEACTIVATED')),
        roles text[] NOT NULL DEFAULT ARRAY['VOLUNTEER']::text[],
        primary_role varchar NOT NULL DEFAULT 'VOLUNTEER', seed_key text UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), last_login_at timestamptz,
        CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
        CONSTRAINT users_roles_valid CHECK (cardinality(roles) >= 1 AND roles <@ ARRAY['VOLUNTEER','ORGANIZER','ADMIN']::text[] AND primary_role = ANY(roles)),
        CONSTRAINT users_display_name_valid CHECK (length(btrim(display_name)) BETWEEN 2 AND 80)
      );
      CREATE UNIQUE INDEX users_email_ci_unique ON users (lower(email));
      CREATE TABLE user_preferences (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        public_profile boolean NOT NULL DEFAULT false, show_display_name boolean NOT NULL DEFAULT true,
        show_activity_history boolean NOT NULL DEFAULT false, show_teams boolean NOT NULL DEFAULT false,
        show_verified_hours boolean NOT NULL DEFAULT false, show_achievements boolean NOT NULL DEFAULT false,
        show_skill_progress boolean NOT NULL DEFAULT false, show_organizations boolean NOT NULL DEFAULT false
      );
      CREATE TABLE organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL,
        slug varchar(80) NOT NULL UNIQUE, description text NOT NULL, logo_url text, website_url text,
        moderation_status varchar NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','suspended')),
        moderation_reason text, seed_key text UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT organizations_slug_valid CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        CONSTRAINT organizations_name_valid CHECK (length(btrim(name)) BETWEEN 2 AND 120)
      );
      CREATE INDEX organizations_status_created ON organizations(moderation_status, created_at DESC, id);
      CREATE TABLE organization_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role varchar NOT NULL CHECK (role IN ('OWNER','MANAGER','REVIEWER')),
        status varchar NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(organization_id, user_id)
      );
      CREATE INDEX memberships_user_status ON organization_memberships(user_id,status);
      CREATE INDEX memberships_organization_status ON organization_memberships(organization_id,status);
      CREATE TABLE auth_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
        CHECK (expires_at > created_at)
      );
      CREATE INDEX sessions_user_active ON auth_sessions(user_id) WHERE revoked_at IS NULL;
      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
        verifier varchar(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), CHECK (expires_at > created_at)
      );
      CREATE INDEX refresh_tokens_session ON refresh_tokens(session_id);
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        action varchar(80) NOT NULL, target_type varchar(80) NOT NULL, target_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX audit_actor_date ON audit_logs(actor_user_id,created_at DESC);
      CREATE INDEX audit_target_date ON audit_logs(target_type,target_id,created_at DESC);
      CREATE TABLE auth_rate_limits (
        key varchar(128) PRIMARY KEY, hits integer NOT NULL CHECK (hits > 0), resets_at timestamptz NOT NULL
      );
      CREATE INDEX rate_limits_expiry ON auth_rate_limits(resets_at);
    `);
  }
  async down(runner: QueryRunner): Promise<void> {
    // Explicit CLI rollback only. Never invoked during application startup.
    await runner.query(
      'DROP TABLE auth_rate_limits, audit_logs, refresh_tokens, auth_sessions, organization_memberships, organizations, user_preferences, users',
    );
  }
}
