import type { MigrationInterface, QueryRunner } from 'typeorm';

export class QuestEngine1792195200000 implements MigrationInterface {
  name = 'QuestEngine1792195200000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE quests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        title varchar(100) NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 100), description varchar(240) NOT NULL DEFAULT '', full_description text NOT NULL DEFAULT '',
        category_id varchar NOT NULL CHECK(category_id IN ('eco','social','animals','culture','education','city')),
        difficulty varchar NOT NULL CHECK(difficulty IN ('Легкий','Середній','Складний')),
        district varchar(80) NOT NULL DEFAULT '', address varchar(200) NOT NULL DEFAULT '',
        latitude double precision, longitude double precision, coordinate_source text, location_label text,
        start_at timestamptz, end_at timestamptz,
        capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 500), xp integer NOT NULL CHECK(xp BETWEEN 10 AND 1000), reward_points integer NOT NULL CHECK(reward_points BETWEEN 0 AND 500),
        requirements text[] NOT NULL DEFAULT '{}', bring text[] NOT NULL DEFAULT '{}', instructions text NOT NULL DEFAULT '', image text, image_alt text NOT NULL DEFAULT '',
        lifecycle varchar NOT NULL DEFAULT 'draft' CHECK(lifecycle IN ('draft','published','active','completed','cancelled','archived')),
        archived_from varchar CHECK(archived_from IN ('completed','cancelled')),
        moderation varchar NOT NULL DEFAULT 'pending' CHECK(moderation IN ('pending','approved','rejected')), moderation_reason text,
        review_submitted_at timestamptz, published_at timestamptz,
        allow_team_participation boolean NOT NULL DEFAULT false, team_participant_limit integer,
        seed_key text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK((start_at IS NULL AND end_at IS NULL) OR (start_at IS NOT NULL AND end_at IS NOT NULL AND end_at > start_at AND end_at <= start_at + interval '12 hours' AND end_at >= start_at + interval '30 minutes')),
        CHECK((latitude IS NULL AND longitude IS NULL AND coordinate_source IS NULL AND location_label IS NULL) OR
          (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND latitude IS NOT NULL AND longitude IS NOT NULL AND coordinate_source IS NOT NULL AND location_label IS NOT NULL)),
        CHECK((NOT allow_team_participation AND team_participant_limit IS NULL) OR (allow_team_participation AND team_participant_limit IS NOT NULL AND team_participant_limit BETWEEN 1 AND 50 AND team_participant_limit <= capacity)),
        CHECK((lifecycle='archived' AND archived_from IS NOT NULL) OR (lifecycle<>'archived' AND archived_from IS NULL)),
        CHECK(lifecycle NOT IN ('published','active','completed') OR (published_at IS NOT NULL AND start_at IS NOT NULL AND end_at IS NOT NULL AND moderation='approved'))
      );
      CREATE INDEX quests_public_date ON quests(start_at,id) WHERE published_at IS NOT NULL;
      CREATE INDEX quests_org_lifecycle ON quests(organization_id,lifecycle);
      CREATE INDEX quests_catalog ON quests(category_id,district,difficulty,start_at);
      CREATE INDEX quests_review_queue ON quests(review_submitted_at,id) WHERE lifecycle='draft' AND moderation='pending';
      CREATE TABLE quest_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status varchar NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')), reason text,
        reviewed_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT, reviewed_at timestamptz,
        submitted_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT applications_user_quest UNIQUE(user_id,quest_id), UNIQUE(id,quest_id,user_id)
      );
      CREATE INDEX applications_quest_status ON quest_applications(quest_id,status);
      CREATE INDEX applications_user_date ON quest_applications(user_id,created_at DESC,id);
      CREATE TABLE participations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL UNIQUE,
        quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status varchar NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','pending','completed','cancelled')), confirmed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT participations_user_quest UNIQUE(user_id,quest_id), UNIQUE(id,quest_id,user_id),
        FOREIGN KEY(application_id,quest_id,user_id) REFERENCES quest_applications(id,quest_id,user_id) ON DELETE RESTRICT,
        CHECK((status='completed') = (confirmed_at IS NOT NULL))
      );
      CREATE INDEX participations_user_date ON participations(user_id,created_at DESC,id);
      CREATE INDEX participations_quest_status ON participations(quest_id,status);
      CREATE TABLE participation_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), participation_id uuid NOT NULL REFERENCES participations(id) ON DELETE RESTRICT,
        submitted_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        description text NOT NULL CHECK(length(btrim(description)) BETWEEN 30 AND 2000), reported_minutes integer CHECK(reported_minutes BETWEEN 1 AND 1440),
        evidence_references text[] NOT NULL DEFAULT '{}' CHECK(cardinality(evidence_references)=0),
        status varchar NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
        submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT, review_reason text,
        UNIQUE(id,participation_id),
        CHECK((status='submitted' AND reviewed_at IS NULL AND reviewed_by_user_id IS NULL) OR (status<>'submitted' AND reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)),
        CHECK(status<>'rejected' OR review_reason IS NOT NULL AND length(btrim(review_reason)) BETWEEN 5 AND 1000)
      );
      CREATE UNIQUE INDEX reports_one_submitted ON participation_reports(participation_id) WHERE status='submitted';
      CREATE UNIQUE INDEX reports_one_approved ON participation_reports(participation_id) WHERE status='approved';
      CREATE INDEX reports_pending_date ON participation_reports(submitted_at,id) WHERE status='submitted';
      CREATE TABLE reward_ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        currency varchar NOT NULL CHECK(currency IN ('XP','REWARD_POINTS')), amount integer NOT NULL,
        transaction_type varchar NOT NULL CHECK(transaction_type IN ('QUEST_COMPLETION','COMPENSATION','REDEMPTION')),
        source_type varchar NOT NULL, source_id uuid NOT NULL, idempotency_key varchar(200) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(metadata)='object'), created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ledger_idempotency_key_key UNIQUE(idempotency_key),
        CONSTRAINT ledger_source_currency UNIQUE(user_id,currency,transaction_type,source_type,source_id),
        CHECK(currency <> 'XP' OR amount >= 0),
        CHECK(transaction_type <> 'QUEST_COMPLETION' OR (amount >= 0 AND source_type='participation')),
        CHECK(transaction_type <> 'REDEMPTION' OR (currency='REWARD_POINTS' AND amount < 0))
      );
      CREATE INDEX ledger_user_date ON reward_ledger(user_id,created_at DESC,id);
      CREATE TABLE reward_accounts (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
        reward_points_balance bigint NOT NULL DEFAULT 0 CHECK(reward_points_balance >= 0)
      );
      CREATE TABLE verified_activities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT, participation_id uuid NOT NULL,
        report_id uuid NOT NULL, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        category_id varchar NOT NULL, district varchar(80) NOT NULL, verified_minutes integer CHECK(verified_minutes BETWEEN 1 AND 1440),
        xp_awarded integer NOT NULL CHECK(xp_awarded BETWEEN 10 AND 1000), reward_points_awarded integer NOT NULL CHECK(reward_points_awarded BETWEEN 0 AND 500),
        source_event_id varchar(200) NOT NULL, verified_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, verified_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT verified_participation_unique UNIQUE(participation_id), CONSTRAINT verified_report_unique UNIQUE(report_id),
        CONSTRAINT verified_user_quest_unique UNIQUE(user_id,quest_id), CONSTRAINT verified_source_event_unique UNIQUE(source_event_id),
        FOREIGN KEY(participation_id,quest_id,user_id) REFERENCES participations(id,quest_id,user_id) ON DELETE RESTRICT,
        FOREIGN KEY(report_id,participation_id) REFERENCES participation_reports(id,participation_id) ON DELETE RESTRICT
      );
      CREATE INDEX verified_user_date ON verified_activities(user_id,verified_at DESC,id);
      CREATE INDEX verified_org_category_date ON verified_activities(organization_id,category_id,verified_at);
      CREATE FUNCTION dniproxp_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        RAISE EXCEPTION 'Append-only records cannot be modified' USING ERRCODE='23514';
      END; $$;
      CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON reward_ledger FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();
      CREATE TRIGGER ledger_no_truncate BEFORE TRUNCATE ON reward_ledger FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only();
      CREATE TRIGGER verified_immutable BEFORE UPDATE OR DELETE ON verified_activities FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();
      CREATE TRIGGER verified_no_truncate BEFORE TRUNCATE ON verified_activities FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only();
      CREATE TRIGGER reports_no_delete BEFORE DELETE ON participation_reports FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();
      CREATE TRIGGER applications_no_delete BEFORE DELETE ON quest_applications FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();
      CREATE TRIGGER participations_no_delete BEFORE DELETE ON participations FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();
      CREATE FUNCTION dniproxp_completion_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE pid uuid; valid boolean;
      BEGIN
        IF TG_TABLE_NAME='reward_ledger' THEN
          IF NEW.transaction_type <> 'QUEST_COMPLETION' THEN RETURN NEW; END IF;
          pid := NEW.source_id;
        ELSE pid := NEW.participation_id; END IF;
        SELECT EXISTS(SELECT 1 FROM verified_activities v
          JOIN participations p ON p.id=v.participation_id
          JOIN quest_applications a ON a.id=p.application_id
          JOIN participation_reports r ON r.id=v.report_id
          JOIN quests q ON q.id=v.quest_id
          JOIN reward_ledger x ON x.source_id=p.id AND x.user_id=p.user_id AND x.source_type='participation' AND x.transaction_type='QUEST_COMPLETION' AND x.currency='XP'
          JOIN reward_ledger b ON b.source_id=p.id AND b.user_id=p.user_id AND b.source_type='participation' AND b.transaction_type='QUEST_COMPLETION' AND b.currency='REWARD_POINTS'
          WHERE p.id=pid AND p.status='completed' AND a.status='approved' AND r.status='approved'
            AND r.submitted_by_user_id=p.user_id AND v.user_id=p.user_id AND v.quest_id=p.quest_id
            AND v.organization_id=q.organization_id AND v.category_id=q.category_id AND v.district=q.district
            AND v.xp_awarded=q.xp AND v.reward_points_awarded=q.reward_points
            AND x.amount=v.xp_awarded AND b.amount=v.reward_points_awarded
            AND v.verified_minutes IS NOT DISTINCT FROM r.reported_minutes
            AND v.verified_at=p.confirmed_at AND v.verified_at=r.reviewed_at AND v.verified_by_user_id=r.reviewed_by_user_id
        ) INTO valid;
        IF NOT valid THEN RAISE EXCEPTION 'Inconsistent verified completion' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER completion_ledger_consistent AFTER INSERT ON reward_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_completion_consistent();
      CREATE CONSTRAINT TRIGGER completion_activity_consistent AFTER INSERT ON verified_activities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_completion_consistent();
      CREATE FUNCTION dniproxp_guard_points() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.currency='REWARD_POINTS' THEN
          INSERT INTO reward_accounts(user_id) VALUES(NEW.user_id) ON CONFLICT(user_id) DO NOTHING;
          UPDATE reward_accounts SET reward_points_balance=reward_points_balance+NEW.amount
            WHERE user_id=NEW.user_id AND reward_points_balance+NEW.amount >= 0;
          IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient reward points' USING ERRCODE='23514'; END IF;
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER ledger_points_guard AFTER INSERT ON reward_ledger FOR EACH ROW EXECUTE FUNCTION dniproxp_guard_points();
      CREATE FUNCTION dniproxp_report_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF OLD.status <> 'submitted' OR NEW.description IS DISTINCT FROM OLD.description OR NEW.reported_minutes IS DISTINCT FROM OLD.reported_minutes
          OR NEW.evidence_references IS DISTINCT FROM OLD.evidence_references OR NEW.participation_id <> OLD.participation_id OR NEW.submitted_by_user_id <> OLD.submitted_by_user_id OR NEW.submitted_at <> OLD.submitted_at THEN
          RAISE EXCEPTION 'Report history is immutable' USING ERRCODE='23514';
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER report_history_guard BEFORE UPDATE ON participation_reports FOR EACH ROW EXECUTE FUNCTION dniproxp_report_history();
    `);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE verified_activities, reward_ledger, reward_accounts, participation_reports, participations, quest_applications, quests;
      DROP FUNCTION dniproxp_completion_consistent(), dniproxp_report_history(), dniproxp_guard_points(), dniproxp_append_only();`);
  }
}
