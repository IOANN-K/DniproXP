import type { MigrationInterface,QueryRunner } from 'typeorm';
export class AiRewards1792454400000 implements MigrationInterface {
  name = 'AiRewards1792454400000';
  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive) throw new Error('BE-05.1 requires a transactional migration');
    await runner.query(`
      CREATE TABLE ai_generation_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,idempotency_key uuid NOT NULL,request_hash varchar(64) NOT NULL CHECK(length(request_hash)=64),
        request jsonb CHECK(request IS NULL OR jsonb_typeof(request)='object'),provider varchar(80) NOT NULL,model varchar(120) NOT NULL,
        status varchar NOT NULL CHECK(status IN ('RUNNING','SUCCEEDED','FAILED')),error_code varchar(80),attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
        is_fixture boolean NOT NULL DEFAULT false,lease_expires_at timestamptz NOT NULL,retention_at timestamptz NOT NULL,
        completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,idempotency_key),
        CHECK((status='RUNNING')=(completed_at IS NULL)),CHECK((status='FAILED')=(error_code IS NOT NULL)),CHECK(retention_at>created_at),
        CHECK((is_fixture AND provider='fixture') OR (NOT is_fixture AND provider='openai-compatible'))
      );
      CREATE INDEX ai_generations_owner_date ON ai_generation_sessions(user_id,created_at,id);
      CREATE INDEX ai_running_lease ON ai_generation_sessions(lease_expires_at) WHERE status='RUNNING';
      CREATE INDEX ai_retention ON ai_generation_sessions(retention_at) WHERE request IS NOT NULL;
      CREATE TABLE ai_quest_suggestions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES ai_generation_sessions(id) ON DELETE RESTRICT,
        position integer NOT NULL CHECK(position BETWEEN 0 AND 2),payload jsonb CHECK(payload IS NULL OR jsonb_typeof(payload)='object'),
        validation_status varchar NOT NULL CHECK(validation_status='VALIDATED'),saved_at timestamptz,
        converted_quest_id uuid UNIQUE REFERENCES quests(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(session_id,position)
      );
      CREATE INDEX ai_saved ON ai_quest_suggestions(saved_at,id) WHERE saved_at IS NOT NULL;
      CREATE TABLE ai_generation_quota(scope varchar(100) NOT NULL,bucket_date date NOT NULL,units integer NOT NULL CHECK(units BETWEEN 1 AND 100000),PRIMARY KEY(scope,bucket_date));
      CREATE INDEX ai_quota_date ON ai_generation_quota(bucket_date);
      CREATE FUNCTION dniproxp_ai_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_TABLE_NAME='ai_generation_sessions' THEN
          IF (to_jsonb(NEW)-'request'-'status'-'error_code'-'attempts'-'completed_at') IS DISTINCT FROM (to_jsonb(OLD)-'request'-'status'-'error_code'-'attempts'-'completed_at')
            OR (NEW.request IS DISTINCT FROM OLD.request AND (NEW.request IS NOT NULL OR OLD.retention_at>now()))
            OR (OLD.status<>'RUNNING' AND (NEW.status,NEW.error_code,NEW.attempts,NEW.completed_at) IS DISTINCT FROM (OLD.status,OLD.error_code,OLD.attempts,OLD.completed_at))
            OR NEW.attempts<OLD.attempts THEN RAISE EXCEPTION 'AI generation history is immutable' USING ERRCODE='23514'; END IF;
        ELSE
          IF (to_jsonb(NEW)-'payload'-'saved_at'-'converted_quest_id') IS DISTINCT FROM (to_jsonb(OLD)-'payload'-'saved_at'-'converted_quest_id')
            OR (NEW.payload IS DISTINCT FROM OLD.payload AND (NEW.payload IS NOT NULL OR EXISTS(SELECT 1 FROM ai_generation_sessions WHERE id=OLD.session_id AND retention_at>now())))
            OR (OLD.saved_at IS NOT NULL AND NEW.saved_at IS DISTINCT FROM OLD.saved_at)
            OR (OLD.converted_quest_id IS NOT NULL AND NEW.converted_quest_id IS DISTINCT FROM OLD.converted_quest_id) THEN RAISE EXCEPTION 'AI suggestion history is immutable' USING ERRCODE='23514'; END IF;
        END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER ai_session_history BEFORE UPDATE ON ai_generation_sessions FOR EACH ROW EXECUTE FUNCTION dniproxp_ai_history();
      CREATE TRIGGER ai_suggestion_history BEFORE UPDATE ON ai_quest_suggestions FOR EACH ROW EXECUTE FUNCTION dniproxp_ai_history();
      CREATE TABLE reward_catalog_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,
        title varchar(100) NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 100),description text NOT NULL CHECK(length(btrim(description)) BETWEEN 20 AND 1500),
        details text NOT NULL CHECK(length(btrim(details)) BETWEEN 20 AND 3000),image varchar CHECK(image IN ('/images/community.jpg','/images/nature.jpg','/images/books.jpg','/images/dogs.jpg')),
        category varchar NOT NULL CHECK(category IN ('Напої та їжа','Екотовари','Враження','Мерч')),price_points integer NOT NULL CHECK(price_points BETWEEN 1 AND 1000000),
        stock integer NOT NULL CHECK(stock BETWEEN 0 AND 1000000),status varchar NOT NULL CHECK(status IN ('ACTIVE','UNAVAILABLE','ARCHIVED')),
        visibility varchar NOT NULL CHECK(visibility IN ('PUBLIC','PRIVATE')),redemption_rules text NOT NULL CHECK(length(btrim(redemption_rules)) BETWEEN 20 AND 2000),
        is_demo boolean NOT NULL DEFAULT false,seed_key varchar UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX reward_catalog_public ON reward_catalog_items(visibility,status,category,created_at,id);
      CREATE TABLE reward_redemptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reward_id uuid NOT NULL REFERENCES reward_catalog_items(id) ON DELETE RESTRICT,organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,
        idempotency_key uuid NOT NULL,price_points integer NOT NULL CHECK(price_points BETWEEN 1 AND 1000000),reward_title varchar(100) NOT NULL,is_demo boolean NOT NULL,
        status varchar NOT NULL CHECK(status IN ('requested','reserved','fulfilled','cancelled','refunded')),
        debit_ledger_id uuid UNIQUE REFERENCES reward_ledger(id) ON DELETE RESTRICT,refund_ledger_id uuid UNIQUE REFERENCES reward_ledger(id) ON DELETE RESTRICT,
        reserved_at timestamptz,fulfilled_at timestamptz,cancelled_at timestamptz,cancellation_reason text,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,idempotency_key),UNIQUE(user_id,reward_id),
        CHECK((fulfilled_at IS NOT NULL)=(status='fulfilled')),CHECK((cancelled_at IS NOT NULL)=(status IN ('cancelled','refunded'))),
        CHECK(status NOT IN ('cancelled','refunded') OR (cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) BETWEEN 5 AND 1000))
      );
      CREATE INDEX redemptions_stock ON reward_redemptions(reward_id,status);
      CREATE INDEX redemptions_owner_date ON reward_redemptions(user_id,created_at,id);
      CREATE TABLE reward_redemption_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),redemption_id uuid NOT NULL REFERENCES reward_redemptions(id) ON DELETE RESTRICT,
        actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,status varchar NOT NULL CHECK(status IN ('requested','reserved','fulfilled','cancelled','refunded')),
        reason text,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(redemption_id,status)
      );
      CREATE FUNCTION dniproxp_reward_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_TABLE_NAME='reward_catalog_items' THEN
          IF (NEW.organization_id,NEW.is_demo,NEW.seed_key,NEW.created_at) IS DISTINCT FROM (OLD.organization_id,OLD.is_demo,OLD.seed_key,OLD.created_at) OR OLD.status='ARCHIVED' THEN RAISE EXCEPTION 'Reward identity/archive is immutable' USING ERRCODE='23514'; END IF;
        ELSE
          IF (to_jsonb(NEW)-'status'-'debit_ledger_id'-'refund_ledger_id'-'reserved_at'-'fulfilled_at'-'cancelled_at'-'cancellation_reason') IS DISTINCT FROM
             (to_jsonb(OLD)-'status'-'debit_ledger_id'-'refund_ledger_id'-'reserved_at'-'fulfilled_at'-'cancelled_at'-'cancellation_reason')
            OR NOT ((OLD.status='requested' AND NEW.status='reserved') OR (OLD.status='reserved' AND NEW.status IN ('fulfilled','cancelled')) OR (OLD.status='cancelled' AND NEW.status='refunded'))
            OR (OLD.debit_ledger_id IS NOT NULL AND NEW.debit_ledger_id IS DISTINCT FROM OLD.debit_ledger_id)
            OR (OLD.reserved_at IS NOT NULL AND NEW.reserved_at IS DISTINCT FROM OLD.reserved_at)
            OR (OLD.cancelled_at IS NOT NULL AND (NEW.cancelled_at,NEW.cancellation_reason) IS DISTINCT FROM (OLD.cancelled_at,OLD.cancellation_reason)) THEN RAISE EXCEPTION 'Invalid redemption history transition' USING ERRCODE='23514'; END IF;
        END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER reward_identity BEFORE UPDATE ON reward_catalog_items FOR EACH ROW EXECUTE FUNCTION dniproxp_reward_terms();
      CREATE TRIGGER redemption_history_guard BEFORE UPDATE ON reward_redemptions FOR EACH ROW EXECUTE FUNCTION dniproxp_reward_terms();
      CREATE FUNCTION dniproxp_reward_stock() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE rid uuid; supply integer; used integer;
      BEGIN
        IF TG_TABLE_NAME='reward_catalog_items' THEN rid:=NEW.id;ELSE rid:=NEW.reward_id;END IF;
        SELECT stock INTO supply FROM reward_catalog_items WHERE id=rid FOR NO KEY UPDATE;
        SELECT count(*) INTO used FROM reward_redemptions WHERE reward_id=rid AND status IN ('reserved','fulfilled');
        IF used>supply THEN RAISE EXCEPTION 'Reward stock exhausted' USING ERRCODE='23514';END IF;RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER reward_stock_item AFTER INSERT OR UPDATE ON reward_catalog_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_reward_stock();
      CREATE CONSTRAINT TRIGGER reward_stock_redemption AFTER INSERT OR UPDATE ON reward_redemptions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_reward_stock();
      CREATE FUNCTION dniproxp_redemption_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE rid uuid; r reward_redemptions; original reward_ledger;
      BEGIN
        IF TG_TABLE_NAME='reward_ledger' THEN
          IF NEW.transaction_type='REDEMPTION' THEN rid:=NEW.source_id;
          ELSIF NEW.transaction_type='COMPENSATION' AND NEW.metadata ? 'originalId' THEN
            SELECT * INTO original FROM reward_ledger WHERE id=(NEW.metadata->>'originalId')::uuid;
            IF original.transaction_type<>'REDEMPTION' THEN RETURN NEW;END IF;rid:=original.source_id;
          ELSE RETURN NEW;END IF;
        ELSE rid:=NEW.id;END IF;
        SELECT * INTO r FROM reward_redemptions WHERE id=rid;
        IF NOT FOUND OR r.reserved_at IS NULL OR r.status NOT IN ('reserved','fulfilled','refunded') THEN RAISE EXCEPTION 'Uncommitted redemption lifecycle' USING ERRCODE='23514';END IF;
        IF NOT EXISTS(SELECT 1 FROM reward_ledger l WHERE l.id=r.debit_ledger_id AND l.user_id=r.user_id AND l.currency='REWARD_POINTS' AND l.amount=-r.price_points AND l.transaction_type='REDEMPTION' AND l.source_type='redemption' AND l.source_id=r.id AND l.idempotency_key='redemption:'||r.id::text)
          OR NOT EXISTS(SELECT 1 FROM reward_catalog_items i WHERE i.id=r.reward_id AND i.organization_id IS NOT DISTINCT FROM r.organization_id AND i.is_demo=r.is_demo)
          OR (SELECT count(*) FROM reward_ledger WHERE source_id=r.id AND transaction_type='REDEMPTION')<>1 THEN RAISE EXCEPTION 'Redemption debit mismatch' USING ERRCODE='23514';END IF;
        IF r.status='refunded' THEN
          IF NOT EXISTS(SELECT 1 FROM reward_ledger l WHERE l.id=r.refund_ledger_id AND l.user_id=r.user_id AND l.currency='REWARD_POINTS' AND l.amount=r.price_points AND l.transaction_type='COMPENSATION' AND l.source_type='compensation' AND l.source_id=r.id AND l.metadata->>'originalId'=r.debit_ledger_id::text AND l.idempotency_key='redemption-refund:'||r.id::text)
            OR (SELECT count(*) FROM reward_ledger WHERE transaction_type='COMPENSATION' AND metadata->>'originalId'=r.debit_ledger_id::text)<>1 THEN RAISE EXCEPTION 'Redemption refund mismatch' USING ERRCODE='23514';END IF;
        ELSIF r.refund_ledger_id IS NOT NULL OR EXISTS(SELECT 1 FROM reward_ledger WHERE transaction_type='COMPENSATION' AND metadata->>'originalId'=r.debit_ledger_id::text) THEN RAISE EXCEPTION 'Unexpected redemption refund' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER redemption_consistent AFTER INSERT OR UPDATE ON reward_redemptions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_redemption_consistent();
      CREATE CONSTRAINT TRIGGER redemption_ledger_consistent AFTER INSERT ON reward_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_redemption_consistent();
    `);
    for (const table of ['ai_generation_sessions','ai_quest_suggestions','reward_catalog_items','reward_redemptions']) await runner.query(`CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();CREATE TRIGGER ${table}_no_truncate BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only()`);
    await runner.query('CREATE TRIGGER redemption_events_immutable BEFORE UPDATE OR DELETE ON reward_redemption_history FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();CREATE TRIGGER redemption_events_no_truncate BEFORE TRUNCATE ON reward_redemption_history FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only()');
  }
  async down(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive) throw new Error('BE-05.1 downgrade requires a transaction');
    await runner.query(`
      LOCK TABLE reward_ledger,ai_generation_sessions,ai_quest_suggestions,reward_catalog_items,reward_redemptions,reward_redemption_history IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN IF EXISTS(SELECT 1 FROM reward_redemptions) OR EXISTS(SELECT 1 FROM reward_catalog_items) OR EXISTS(SELECT 1 FROM ai_generation_sessions) THEN RAISE EXCEPTION 'BE-05.1 history exists; use a forward migration';END IF;END; $$;
      DROP TRIGGER redemption_ledger_consistent ON reward_ledger;
      DROP TABLE reward_redemption_history,reward_redemptions,reward_catalog_items,ai_quest_suggestions,ai_generation_sessions,ai_generation_quota;
      DROP FUNCTION dniproxp_redemption_consistent(),dniproxp_reward_stock(),dniproxp_reward_terms(),dniproxp_ai_history();
    `);
  }
}
