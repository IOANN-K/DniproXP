import type { MigrationInterface,QueryRunner } from 'typeorm';
export class VerifiedProgress1792281600000 implements MigrationInterface {
 name='VerifiedProgress1792281600000';
 async up(runner:QueryRunner):Promise<void> {
  if(!runner.isTransactionActive)throw new Error('BE-03 migration requires an active transaction');
  await runner.query(`
   CREATE TABLE impact_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_verified_activity_id uuid NOT NULL UNIQUE REFERENCES verified_activities(id) ON DELETE RESTRICT,
    quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    participant_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, district varchar(80) NOT NULL,category varchar NOT NULL,
    occurred_at timestamptz NOT NULL,verified_at timestamptz NOT NULL,verified_minutes integer CHECK(verified_minutes BETWEEN 1 AND 1440),
    metrics jsonb NOT NULL CHECK(jsonb_typeof(metrics)='array'),provenance varchar NOT NULL CHECK(provenance='organizer-confirmation')
   );
   CREATE INDEX impact_period ON impact_events(verified_at,id);
   CREATE INDEX impact_quest_period ON impact_events(quest_id,occurred_at,id);
   CREATE INDEX impact_district_period ON impact_events(district,verified_at);
   CREATE INDEX impact_category_period ON impact_events(category,verified_at);
   CREATE INDEX impact_org_category_district ON impact_events(organization_id,category,district,verified_at);
   CREATE INDEX impact_user_period ON impact_events(participant_user_id,verified_at);
   CREATE TABLE impact_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verified_activity_id uuid NOT NULL UNIQUE REFERENCES verified_activities(id) ON DELETE RESTRICT,
    quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    verified_at timestamptz NOT NULL,verified_minutes integer CHECK(verified_minutes BETWEEN 1 AND 1440),metrics jsonb NOT NULL CHECK(jsonb_typeof(metrics)='array'),
    public_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),issued_at timestamptz NOT NULL DEFAULT clock_timestamp()
   );
   CREATE INDEX receipt_user_date ON impact_receipts(user_id,issued_at DESC,id);
   CREATE FUNCTION dniproxp_project_verified_impact() RETURNS trigger LANGUAGE plpgsql AS $$
   DECLARE measured jsonb;
   BEGIN
    measured:=CASE WHEN NEW.verified_minutes IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('type','volunteer_hours','value',NEW.verified_minutes::numeric/60,'unit','hours','provenance','report-confirmation')) END;
    INSERT INTO impact_events(source_verified_activity_id,quest_id,organization_id,participant_user_id,district,category,occurred_at,verified_at,verified_minutes,metrics,provenance)
    VALUES(NEW.id,NEW.quest_id,NEW.organization_id,NEW.user_id,NEW.district,NEW.category_id,NEW.verified_at,NEW.verified_at,NEW.verified_minutes,measured,'organizer-confirmation') ON CONFLICT(source_verified_activity_id) DO NOTHING;
    INSERT INTO impact_receipts(user_id,verified_activity_id,quest_id,organization_id,verified_at,verified_minutes,metrics,issued_at)
    VALUES(NEW.user_id,NEW.id,NEW.quest_id,NEW.organization_id,NEW.verified_at,NEW.verified_minutes,measured,GREATEST(clock_timestamp(),NEW.verified_at)) ON CONFLICT(verified_activity_id) DO NOTHING;
    RETURN NEW;
   END; $$;
   CREATE TRIGGER verified_to_impact AFTER INSERT ON verified_activities FOR EACH ROW EXECUTE FUNCTION dniproxp_project_verified_impact();
   INSERT INTO impact_events(source_verified_activity_id,quest_id,organization_id,participant_user_id,district,category,occurred_at,verified_at,verified_minutes,metrics,provenance)
    SELECT id,quest_id,organization_id,user_id,district,category_id,verified_at,verified_at,verified_minutes,
    CASE WHEN verified_minutes IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('type','volunteer_hours','value',verified_minutes::numeric/60,'unit','hours','provenance','report-confirmation')) END,'organizer-confirmation' FROM verified_activities ON CONFLICT DO NOTHING;
   INSERT INTO impact_receipts(user_id,verified_activity_id,quest_id,organization_id,verified_at,verified_minutes,metrics)
    SELECT participant_user_id,source_verified_activity_id,quest_id,organization_id,verified_at,verified_minutes,metrics FROM impact_events ON CONFLICT DO NOTHING;
   CREATE TABLE collective_impact_measurements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,source_verified_activity_id uuid NOT NULL REFERENCES verified_activities(id) ON DELETE RESTRICT,
    category varchar NOT NULL,district varchar(80) NOT NULL,
    metric varchar NOT NULL CHECK(metric IN ('waste_kg','trees_planted','animals_helped','people_helped','area_cleaned','humanitarian_units')),
    value numeric(20,6) NOT NULL CHECK(value>=0 AND value<=1000000),unit varchar NOT NULL,summary text NOT NULL CHECK(length(btrim(summary)) BETWEEN 10 AND 2000),
    verified_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,operation_id uuid NOT NULL,supersedes_id uuid UNIQUE,
    measured_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,quest_id,metric),UNIQUE(quest_id,operation_id),
    FOREIGN KEY(supersedes_id,quest_id,metric) REFERENCES collective_impact_measurements(id,quest_id,metric) ON DELETE RESTRICT,
    CHECK((metric='waste_kg' AND unit='kg') OR (metric='area_cleaned' AND unit='m2') OR (metric IN ('trees_planted','animals_helped','people_helped') AND unit='count' AND trunc(value)=value) OR (metric='humanitarian_units' AND unit='units' AND trunc(value)=value))
   );
   CREATE UNIQUE INDEX collective_initial_unique ON collective_impact_measurements(quest_id,metric) WHERE supersedes_id IS NULL;
   CREATE INDEX collective_scope_date ON collective_impact_measurements(organization_id,measured_at);
   CREATE VIEW current_collective_impact AS SELECT m.* FROM collective_impact_measurements m WHERE NOT EXISTS(SELECT 1 FROM collective_impact_measurements replacement WHERE replacement.supersedes_id=m.id);
  `);
  for (const table of ['mission_definitions','challenge_definitions']) {
   await runner.query(`CREATE TABLE ${table} (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    slug varchar(100) NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),title varchar(150) NOT NULL,description text NOT NULL,category varchar NOT NULL,cover_image text NOT NULL,
    reward_xp integer NOT NULL CHECK(reward_xp BETWEEN 0 AND 10000),reward_points integer NOT NULL CHECK(reward_points BETWEEN 0 AND 10000),achievement jsonb NOT NULL CHECK(jsonb_typeof(achievement)='object'),
    starts_at timestamptz,ends_at timestamptz,status varchar NOT NULL DEFAULT 'DRAFT',rules jsonb NOT NULL CHECK(jsonb_typeof(rules)='object'),
    seed_key text UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(starts_at IS NULL OR ends_at IS NULL OR starts_at<=ends_at)
   )`);
  }
  await runner.query(`
   ALTER TABLE mission_definitions ADD COLUMN short_description varchar(240) NOT NULL,ADD COLUMN difficulty varchar NOT NULL CHECK(difficulty IN ('Легкий','Середній','Складний')),ADD COLUMN estimated_duration varchar(200) NOT NULL,
    ADD CONSTRAINT mission_status CHECK(status IN ('DRAFT','PUBLISHED','ACTIVE','COMPLETED','ARCHIVED'));
   ALTER TABLE challenge_definitions ADD CONSTRAINT challenge_status CHECK(status IN ('DRAFT','UPCOMING','ACTIVE','COMPLETED','EXPIRED','CANCELLED')),ADD CONSTRAINT challenge_dates CHECK(starts_at IS NOT NULL AND ends_at IS NOT NULL),ADD CONSTRAINT challenge_completion_milestone CHECK((rules->'milestones') @> '[100]'::jsonb);
   CREATE INDEX mission_public ON mission_definitions(status,created_at,id);
   CREATE INDEX challenge_period ON challenge_definitions(starts_at,ends_at,status);
   CREATE TABLE mission_quest_links(mission_id uuid NOT NULL REFERENCES mission_definitions(id) ON DELETE RESTRICT,quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,PRIMARY KEY(mission_id,quest_id));
   CREATE TABLE mission_dependencies(mission_id uuid NOT NULL REFERENCES mission_definitions(id) ON DELETE RESTRICT,required_mission_id uuid NOT NULL REFERENCES mission_definitions(id) ON DELETE RESTRICT,PRIMARY KEY(mission_id,required_mission_id),CHECK(mission_id<>required_mission_id));
   CREATE TABLE challenge_quest_links(challenge_id uuid NOT NULL REFERENCES challenge_definitions(id) ON DELETE RESTRICT,quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,PRIMARY KEY(challenge_id,quest_id));
   CREATE TABLE mission_enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid NOT NULL REFERENCES mission_definitions(id) ON DELETE RESTRICT,user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,joined_at timestamptz NOT NULL DEFAULT now(),UNIQUE(mission_id,user_id));
   CREATE TABLE mission_completions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid NOT NULL REFERENCES mission_definitions(id) ON DELETE RESTRICT,user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,completed_at timestamptz NOT NULL,evidence_ids jsonb NOT NULL CHECK(jsonb_typeof(evidence_ids)='array'),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(mission_id,user_id));
   CREATE TABLE challenge_participants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),challenge_id uuid NOT NULL REFERENCES challenge_definitions(id) ON DELETE RESTRICT,user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,joined_at timestamptz NOT NULL DEFAULT now(),UNIQUE(challenge_id,user_id));
   CREATE TABLE challenge_milestone_completions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),challenge_id uuid NOT NULL REFERENCES challenge_definitions(id) ON DELETE RESTRICT,threshold integer NOT NULL CHECK(threshold BETWEEN 1 AND 100),evidence_ids jsonb NOT NULL CHECK(jsonb_typeof(evidence_ids)='array'),reached_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(challenge_id,threshold));
   CREATE TABLE progress_reward_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind varchar NOT NULL CHECK(kind IN ('mission','challenge')),definition_id uuid NOT NULL,mission_id uuid GENERATED ALWAYS AS (CASE WHEN kind='mission' THEN definition_id END) STORED REFERENCES mission_definitions(id) ON DELETE RESTRICT,challenge_id uuid GENERATED ALWAYS AS (CASE WHEN kind='challenge' THEN definition_id END) STORED REFERENCES challenge_definitions(id) ON DELETE RESTRICT,user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,xp integer NOT NULL CHECK(xp BETWEEN 0 AND 10000),reward_points integer NOT NULL CHECK(reward_points BETWEEN 0 AND 10000),achievement jsonb NOT NULL,evidence_ids jsonb NOT NULL CHECK(jsonb_typeof(evidence_ids)='array'),claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(kind,definition_id,user_id));
   CREATE INDEX mission_enrollments_user ON mission_enrollments(user_id,mission_id);
   CREATE INDEX challenge_participants_user ON challenge_participants(user_id,challenge_id);
   CREATE INDEX mission_links_quest ON mission_quest_links(quest_id,mission_id);
   CREATE INDEX challenge_links_quest ON challenge_quest_links(quest_id,challenge_id);
   CREATE INDEX mission_completions_user ON mission_completions(user_id,completed_at);
   CREATE INDEX claims_user ON progress_reward_claims(user_id,claimed_at);
   ALTER TABLE reward_ledger DROP CONSTRAINT reward_ledger_transaction_type_check;
   ALTER TABLE reward_ledger ADD CONSTRAINT reward_ledger_transaction_type_check CHECK(transaction_type IN ('QUEST_COMPLETION','COMPENSATION','REDEMPTION','MISSION_REWARD','CHALLENGE_REWARD'));
   CREATE FUNCTION dniproxp_freeze_definition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF OLD.status<>'DRAFT' AND ((to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') OR NEW.status='DRAFT') THEN RAISE EXCEPTION 'Published definition is immutable' USING ERRCODE='23514'; END IF;
    RETURN NEW;
   END; $$;
   CREATE TRIGGER mission_definition_frozen BEFORE UPDATE ON mission_definitions FOR EACH ROW EXECUTE FUNCTION dniproxp_freeze_definition();
   CREATE TRIGGER challenge_definition_frozen BEFORE UPDATE ON challenge_definitions FOR EACH ROW EXECUTE FUNCTION dniproxp_freeze_definition();
   CREATE VIEW challenge_eligible_activities AS
    SELECT c.id AS challenge_id,e.* FROM challenge_definitions c
    JOIN challenge_quest_links link ON link.challenge_id=c.id JOIN impact_events e ON e.quest_id=link.quest_id
    WHERE c.status NOT IN ('DRAFT','CANCELLED') AND e.verified_minutes IS NOT NULL AND e.occurred_at>=c.starts_at AND e.occurred_at<=c.ends_at
     AND (jsonb_array_length(c.rules->'categoryIds')=0 OR c.rules->'categoryIds' ? e.category)
     AND (jsonb_array_length(c.rules->'districts')=0 OR c.rules->'districts' ? e.district)
     AND (jsonb_array_length(c.rules->'organizationIds')=0 OR c.rules->'organizationIds' ? e.organization_id::text);
   CREATE VIEW challenge_contributions AS
    SELECT md5(c.id::text||(g->>'id')||e.id::text)::uuid AS id,c.id AS challenge_id,(g->>'id')::uuid AS goal_id,e.participant_user_id AS user_id,e.quest_id,e.source_verified_activity_id AS verified_activity_id,
     NULL::uuid AS measurement_id,g->>'metric' AS metric,g->>'unit' AS unit,e.verified_minutes::numeric/60 AS value,e.occurred_at,'PERSONAL'::text AS scope
    FROM challenge_definitions c CROSS JOIN LATERAL jsonb_array_elements(c.rules->'goals') g JOIN challenge_eligible_activities e ON e.challenge_id=c.id WHERE g->>'metric'='VOLUNTEER_HOURS'
    UNION ALL
    SELECT md5(c.id::text||(g->>'id')||m.id::text)::uuid,c.id,(g->>'id')::uuid,anchor.participant_user_id,m.quest_id,anchor.source_verified_activity_id,m.id,g->>'metric',g->>'unit',m.value,anchor.occurred_at,'QUEST'
    FROM challenge_definitions c CROSS JOIN LATERAL jsonb_array_elements(c.rules->'goals') g
    JOIN current_collective_impact m ON m.metric=CASE g->>'metric' WHEN 'LITTER_KG' THEN 'waste_kg' WHEN 'TREES_PLANTED' THEN 'trees_planted' WHEN 'HUMANITARIAN_UNITS' THEN 'humanitarian_units' ELSE NULL END
    JOIN LATERAL (SELECT * FROM challenge_eligible_activities e WHERE e.challenge_id=c.id AND e.quest_id=m.quest_id ORDER BY e.occurred_at,e.id LIMIT 1) anchor ON true;
   CREATE FUNCTION dniproxp_progress_claim_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
   DECLARE uid uuid; did uuid; k varchar; valid boolean;
   BEGIN
    IF TG_TABLE_NAME='reward_ledger' THEN
     IF NEW.transaction_type NOT IN ('MISSION_REWARD','CHALLENGE_REWARD') THEN RETURN NEW; END IF;
     uid:=NEW.user_id;did:=NEW.source_id;k:=CASE NEW.transaction_type WHEN 'MISSION_REWARD' THEN 'mission' ELSE 'challenge' END;
     IF NEW.source_type<>k THEN RAISE EXCEPTION 'Invalid reward source' USING ERRCODE='23514'; END IF;
    ELSE uid:=NEW.user_id;did:=NEW.definition_id;k:=NEW.kind; END IF;
    SELECT EXISTS(SELECT 1 FROM progress_reward_claims claim
      JOIN (SELECT id,reward_xp,reward_points,achievement,'mission'::text AS kind FROM mission_definitions WHERE status<>'DRAFT' UNION ALL SELECT id,reward_xp,reward_points,achievement,'challenge' FROM challenge_definitions WHERE status<>'DRAFT') d ON d.id=claim.definition_id AND d.kind=claim.kind
      JOIN reward_ledger x ON x.user_id=uid AND x.source_id=did AND x.source_type=k AND x.currency='XP' AND x.transaction_type=CASE k WHEN 'mission' THEN 'MISSION_REWARD' ELSE 'CHALLENGE_REWARD' END
      JOIN reward_ledger p ON p.user_id=uid AND p.source_id=did AND p.source_type=k AND p.currency='REWARD_POINTS' AND p.transaction_type=x.transaction_type
      WHERE claim.user_id=uid AND claim.definition_id=did AND claim.kind=k AND claim.xp=d.reward_xp AND claim.reward_points=d.reward_points AND claim.achievement=d.achievement AND x.amount=claim.xp AND p.amount=claim.reward_points
      AND (k<>'mission' OR EXISTS(SELECT 1 FROM mission_completions mc WHERE mc.user_id=uid AND mc.mission_id=did))) INTO valid;
    IF NOT valid THEN RAISE EXCEPTION 'Incomplete progress reward' USING ERRCODE='23514'; END IF;
    RETURN NEW;
   END; $$;
   CREATE CONSTRAINT TRIGGER progress_ledger_consistency AFTER INSERT ON reward_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_progress_claim_consistent();
   CREATE CONSTRAINT TRIGGER progress_claim_consistency AFTER INSERT ON progress_reward_claims DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_progress_claim_consistent();
  `);
  for(const table of ['impact_events','impact_receipts','collective_impact_measurements','mission_completions','progress_reward_claims','challenge_milestone_completions','mission_enrollments','challenge_participants']) {
   await runner.query(`CREATE TRIGGER ${table}_immutable BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only(); CREATE TRIGGER ${table}_no_truncate BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only()`);
  }
 }
 async down(runner:QueryRunner):Promise<void> {
  if(!runner.isTransactionActive)throw new Error('BE-03 downgrade requires an active transaction');
  await runner.query(`LOCK TABLE verified_activities,reward_ledger,impact_events,impact_receipts,collective_impact_measurements,mission_definitions,challenge_definitions,mission_quest_links,mission_dependencies,challenge_quest_links,mission_enrollments,mission_completions,challenge_participants,challenge_milestone_completions,progress_reward_claims IN ACCESS EXCLUSIVE MODE;
   DO $$ BEGIN IF EXISTS(SELECT 1 FROM reward_ledger WHERE transaction_type IN ('MISSION_REWARD','CHALLENGE_REWARD')) OR EXISTS(SELECT 1 FROM impact_events) OR EXISTS(SELECT 1 FROM impact_receipts) OR EXISTS(SELECT 1 FROM collective_impact_measurements) OR EXISTS(SELECT 1 FROM mission_completions) OR EXISTS(SELECT 1 FROM challenge_milestone_completions) OR EXISTS(SELECT 1 FROM mission_enrollments) OR EXISTS(SELECT 1 FROM challenge_participants) OR EXISTS(SELECT 1 FROM mission_definitions WHERE status<>'DRAFT') OR EXISTS(SELECT 1 FROM challenge_definitions WHERE status<>'DRAFT') THEN RAISE EXCEPTION 'Cannot downgrade with published or immutable BE-03 history; preserve sources, receipts and financial records'; END IF; END; $$;
   DROP TRIGGER verified_to_impact ON verified_activities; DROP TRIGGER progress_ledger_consistency ON reward_ledger;
   DROP VIEW challenge_contributions,challenge_eligible_activities,current_collective_impact;
   DROP TABLE progress_reward_claims,challenge_milestone_completions,challenge_participants,mission_completions,mission_enrollments,mission_dependencies,mission_quest_links,challenge_quest_links,mission_definitions,challenge_definitions,impact_receipts,impact_events,collective_impact_measurements;
   DROP FUNCTION dniproxp_progress_claim_consistent(),dniproxp_freeze_definition(),dniproxp_project_verified_impact();
   ALTER TABLE reward_ledger DROP CONSTRAINT reward_ledger_transaction_type_check;
   ALTER TABLE reward_ledger ADD CONSTRAINT reward_ledger_transaction_type_check CHECK(transaction_type IN ('QUEST_COMPLETION','COMPENSATION','REDEMPTION'));`);
 }
}
