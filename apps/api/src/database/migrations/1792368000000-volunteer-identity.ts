import type { MigrationInterface, QueryRunner } from 'typeorm';
import { SKILLS_V1, ACHIEVEMENTS_V1 } from '../../identity/catalog.v1.js';

export class VolunteerIdentity1792368000000 implements MigrationInterface {
  name = 'VolunteerIdentity1792368000000';
  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive) throw new Error('BE-04 requires a transactional migration');
    await runner.query(`
      CREATE TABLE teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug varchar(100) NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        name varchar(70) NOT NULL CHECK(length(btrim(name)) BETWEEN 3 AND 70),description text NOT NULL CHECK(length(btrim(description)) BETWEEN 30 AND 1500),
        avatar varchar NOT NULL CHECK(avatar IN ('leaf','heart','flag','sun')),cover_image varchar NOT NULL,
        category varchar NOT NULL CHECK(category IN ('eco','social','animals','culture','education','city')),city varchar NOT NULL DEFAULT 'Дніпро' CHECK(city='Дніпро'),
        captain_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,visibility varchar NOT NULL CHECK(visibility IN ('PUBLIC','PRIVATE')),
        join_policy varchar NOT NULL CHECK(join_policy IN ('OPEN','APPROVAL','INVITE_ONLY')),member_limit integer NOT NULL CHECK(member_limit BETWEEN 2 AND 50),
        status varchar NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ARCHIVED')),seed_key text UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(visibility<>'PRIVATE' OR join_policy='INVITE_ONLY')
      );
      CREATE INDEX teams_public ON teams(visibility,status,created_at,id);
      CREATE TABLE team_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,role varchar NOT NULL CHECK(role IN ('OWNER','MANAGER','MEMBER')),
        status varchar NOT NULL CHECK(status IN ('ACTIVE','LEFT','REMOVED')),joined_at timestamptz NOT NULL DEFAULT now(),left_at timestamptz,
        invited_by uuid REFERENCES users(id) ON DELETE RESTRICT,approved_by uuid REFERENCES users(id) ON DELETE RESTRICT,
        CHECK((status='ACTIVE')=(left_at IS NULL)),CHECK(left_at IS NULL OR left_at>=joined_at),UNIQUE(id,team_id,user_id)
      );
      CREATE UNIQUE INDEX team_membership_active ON team_memberships(team_id,user_id) WHERE status='ACTIVE';
      CREATE UNIQUE INDEX team_one_owner ON team_memberships(team_id) WHERE status='ACTIVE' AND role='OWNER';
      CREATE INDEX memberships_user ON team_memberships(user_id,status,team_id);
      CREATE TABLE team_progress_locks(team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE RESTRICT);
      CREATE TABLE team_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
        invited_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,invited_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status varchar NOT NULL CHECK(status IN ('PENDING','ACCEPTED','DECLINED','EXPIRED','REVOKED')),created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,resolved_at timestamptz,CHECK(expires_at>created_at),CHECK((status='PENDING')=(resolved_at IS NULL)),CHECK(invited_user_id<>invited_by)
      );
      CREATE UNIQUE INDEX team_invitation_pending ON team_invitations(team_id,invited_user_id) WHERE status='PENDING';
      CREATE INDEX invitations_user ON team_invitations(invited_user_id,created_at,id);
      CREATE TABLE team_join_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,status varchar NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
        reason text,created_at timestamptz NOT NULL DEFAULT now(),reviewed_by uuid REFERENCES users(id) ON DELETE RESTRICT,reviewed_at timestamptz,
        CHECK((status='PENDING')=(reviewed_at IS NULL)),CHECK(status<>'REJECTED' OR length(btrim(reason)) BETWEEN 5 AND 1000)
      );
      CREATE UNIQUE INDEX team_request_pending ON team_join_requests(team_id,user_id) WHERE status='PENDING';
      CREATE INDEX requests_team ON team_join_requests(team_id,created_at,id);
      CREATE TABLE team_quest_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
        quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,submitted_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        operation_id uuid NOT NULL,status varchar NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
        participant_count integer NOT NULL CHECK(participant_count BETWEEN 1 AND 50),submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        reviewed_at timestamptz,reviewed_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,review_reason text,
        UNIQUE(team_id,operation_id),UNIQUE(id,team_id,quest_id),CHECK(status<>'REJECTED' OR length(btrim(review_reason)) BETWEEN 5 AND 1000)
      );
      CREATE INDEX team_applications_quest ON team_quest_applications(quest_id,submitted_at,id);
      CREATE INDEX team_applications_team ON team_quest_applications(team_id,submitted_at,id);
      ALTER TABLE quest_applications ADD COLUMN team_application_id uuid REFERENCES team_quest_applications(id) ON DELETE RESTRICT;
      ALTER TABLE participations ADD COLUMN team_application_id uuid REFERENCES team_quest_applications(id) ON DELETE RESTRICT;
      CREATE TABLE team_quest_application_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_application_id uuid NOT NULL,team_id uuid NOT NULL,quest_id uuid NOT NULL,user_id uuid NOT NULL,
        membership_id uuid NOT NULL,application_id uuid NOT NULL,
        FOREIGN KEY(team_application_id,team_id,quest_id) REFERENCES team_quest_applications(id,team_id,quest_id) ON DELETE RESTRICT,
        FOREIGN KEY(membership_id,team_id,user_id) REFERENCES team_memberships(id,team_id,user_id) ON DELETE RESTRICT,
        FOREIGN KEY(application_id,quest_id,user_id) REFERENCES quest_applications(id,quest_id,user_id) ON DELETE RESTRICT,
        UNIQUE(team_application_id,user_id),UNIQUE(team_application_id,application_id,user_id,quest_id)
      );
      ALTER TABLE quest_applications ADD CONSTRAINT application_team_roster FOREIGN KEY(team_application_id,id,user_id,quest_id)
        REFERENCES team_quest_application_members(team_application_id,application_id,user_id,quest_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
      ALTER TABLE participations ADD CONSTRAINT participation_team_roster FOREIGN KEY(team_application_id,application_id,user_id,quest_id)
        REFERENCES team_quest_application_members(team_application_id,application_id,user_id,quest_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
      CREATE TABLE team_activity_attributions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL,team_application_id uuid NOT NULL,membership_id uuid NOT NULL,
        verified_activity_id uuid NOT NULL UNIQUE REFERENCES verified_activities(id) ON DELETE RESTRICT,
        participation_id uuid NOT NULL UNIQUE,quest_id uuid NOT NULL,user_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        FOREIGN KEY(team_application_id,team_id,quest_id) REFERENCES team_quest_applications(id,team_id,quest_id) ON DELETE RESTRICT,
        FOREIGN KEY(membership_id,team_id,user_id) REFERENCES team_memberships(id,team_id,user_id) ON DELETE RESTRICT,
        FOREIGN KEY(participation_id,quest_id,user_id) REFERENCES participations(id,quest_id,user_id) ON DELETE RESTRICT
      );
      CREATE FUNCTION dniproxp_validate_team_attribution() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NOT EXISTS(SELECT 1 FROM verified_activities v JOIN participations p ON p.id=v.participation_id
          JOIN team_quest_application_members m ON m.team_application_id=p.team_application_id AND m.application_id=p.application_id
          WHERE v.id=NEW.verified_activity_id AND v.participation_id=NEW.participation_id AND v.quest_id=NEW.quest_id AND v.user_id=NEW.user_id
            AND m.team_application_id=NEW.team_application_id AND m.team_id=NEW.team_id AND m.user_id=NEW.user_id AND m.membership_id=NEW.membership_id) THEN
          RAISE EXCEPTION 'Invalid verified team attribution' USING ERRCODE='23514';
        END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER team_attribution_source BEFORE INSERT ON team_activity_attributions FOR EACH ROW EXECUTE FUNCTION dniproxp_validate_team_attribution();
      CREATE INDEX team_attribution_period ON team_activity_attributions(team_id,verified_activity_id);
      CREATE INDEX team_attribution_user ON team_activity_attributions(user_id,team_id);
      CREATE VIEW team_application_progress AS SELECT g.*,CASE
        WHEN counts.done>0 AND counts.live=counts.done THEN 'COMPLETED' WHEN counts.done>0 THEN 'PARTIAL'
        WHEN counts.rejected=counts.total THEN 'REJECTED' WHEN counts.live=0 THEN 'CANCELLED'
        WHEN counts.started>0 THEN 'IN_PROGRESS' WHEN counts.approved=counts.live THEN 'APPROVED' ELSE 'PENDING' END AS computed_status
      FROM team_quest_applications g CROSS JOIN LATERAL (
        SELECT count(*) AS total,
          count(*) FILTER(WHERE a.team_application_id=g.id AND a.status='rejected') AS rejected,
          count(*) FILTER(WHERE a.team_application_id=g.id AND (a.status='pending' OR (a.status='approved' AND p.status<>'cancelled'))) AS live,
          count(*) FILTER(WHERE a.team_application_id=g.id AND a.status='approved' AND p.status<>'cancelled') AS approved,
          count(*) FILTER(WHERE a.team_application_id=g.id AND p.team_application_id=g.id AND p.status='completed') AS done,
          count(*) FILTER(WHERE a.team_application_id=g.id AND p.team_application_id=g.id AND p.status IN ('active','pending')) AS started
        FROM team_quest_application_members m JOIN quest_applications a ON a.id=m.application_id LEFT JOIN participations p ON p.application_id=a.id
        WHERE m.team_application_id=g.id
      ) counts;
      CREATE FUNCTION dniproxp_team_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE t teams; used integer;
      BEGIN
        SELECT * INTO t FROM teams WHERE id=NEW.team_id FOR NO KEY UPDATE;
        IF TG_OP='UPDATE' AND (OLD.status<>'ACTIVE' OR (OLD.team_id,OLD.user_id,OLD.joined_at,OLD.invited_by,OLD.approved_by) IS DISTINCT FROM (NEW.team_id,NEW.user_id,NEW.joined_at,NEW.invited_by,NEW.approved_by)) THEN
          RAISE EXCEPTION 'Membership history is immutable; rejoin creates a new episode' USING ERRCODE='23514';
        END IF;
        IF NEW.status='ACTIVE' THEN
          SELECT count(*) INTO used FROM team_memberships WHERE team_id=NEW.team_id AND status='ACTIVE' AND id<>NEW.id;
          IF t.status<>'ACTIVE' OR used>=t.member_limit THEN RAISE EXCEPTION 'Team capacity or lifecycle violation' USING ERRCODE='23514'; END IF;
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER membership_capacity BEFORE INSERT OR UPDATE ON team_memberships FOR EACH ROW EXECUTE FUNCTION dniproxp_team_capacity();
      CREATE FUNCTION dniproxp_team_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF OLD.status='ARCHIVED' OR NEW.member_limit<(SELECT count(*) FROM team_memberships WHERE team_id=NEW.id AND status='ACTIVE') THEN
          RAISE EXCEPTION 'Team lifecycle or capacity violation' USING ERRCODE='23514';
        END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER team_config_guard BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION dniproxp_team_guard();
      CREATE FUNCTION dniproxp_team_captain() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE tid uuid; t teams;
      BEGIN
        IF TG_TABLE_NAME='teams' THEN tid:=NEW.id; ELSE tid:=NEW.team_id; END IF;
        SELECT * INTO t FROM teams WHERE id=tid;
        IF t.status='ACTIVE' AND (SELECT count(*) FROM team_memberships WHERE team_id=tid AND status='ACTIVE' AND role='OWNER' AND user_id=t.captain_user_id)<>1 THEN
          RAISE EXCEPTION 'Active team needs exactly its designated captain' USING ERRCODE='23514';
        END IF; RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER team_captain_consistent AFTER INSERT OR UPDATE ON teams DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_team_captain();
      CREATE CONSTRAINT TRIGGER membership_captain_consistent AFTER INSERT OR UPDATE ON team_memberships DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_team_captain();
      CREATE FUNCTION dniproxp_quest_seats() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE qid uuid; cap integer; used integer;
      BEGIN
        IF TG_TABLE_NAME='quests' THEN qid:=NEW.id; ELSE qid:=NEW.quest_id; END IF;
        SELECT capacity INTO cap FROM quests WHERE id=qid FOR NO KEY UPDATE;
        SELECT count(*) INTO used FROM quest_applications a LEFT JOIN participations p ON p.application_id=a.id
          WHERE a.quest_id=qid AND (a.status='pending' OR (a.status='approved' AND p.status<>'cancelled'));
        IF used>cap THEN RAISE EXCEPTION 'Quest capacity exceeded' USING ERRCODE='23514'; END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER applications_seat_guard AFTER INSERT OR UPDATE ON quest_applications FOR EACH ROW EXECUTE FUNCTION dniproxp_quest_seats();
      CREATE TRIGGER participations_seat_guard AFTER INSERT OR UPDATE ON participations FOR EACH ROW EXECUTE FUNCTION dniproxp_quest_seats();
      CREATE TRIGGER quest_seat_guard AFTER UPDATE ON quests FOR EACH ROW EXECUTE FUNCTION dniproxp_quest_seats();
      CREATE FUNCTION dniproxp_team_roster_count() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE gid uuid; g team_quest_applications; lim integer;
      BEGIN
        IF TG_TABLE_NAME='team_quest_applications' THEN gid:=NEW.id; ELSE gid:=NEW.team_application_id; END IF;
        SELECT * INTO g FROM team_quest_applications WHERE id=gid;
        SELECT CASE WHEN allow_team_participation THEN team_participant_limit ELSE 0 END INTO lim FROM quests WHERE id=g.quest_id;
        IF g.participant_count<>(SELECT count(*) FROM team_quest_application_members WHERE team_application_id=gid) OR g.participant_count>lim THEN
          RAISE EXCEPTION 'Invalid team roster or limit' USING ERRCODE='23514'; END IF; RETURN NEW;
      END; $$;
      CREATE CONSTRAINT TRIGGER team_roster_complete AFTER INSERT OR UPDATE ON team_quest_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_team_roster_count();
      CREATE CONSTRAINT TRIGGER team_roster_member_complete AFTER INSERT ON team_quest_application_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dniproxp_team_roster_count();
      CREATE FUNCTION dniproxp_application_team_binding() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='UPDATE' AND NEW.team_application_id IS DISTINCT FROM OLD.team_application_id THEN
          IF (TG_TABLE_NAME='quest_applications' AND OLD.status<>'withdrawn') OR (TG_TABLE_NAME='participations' AND OLD.status<>'cancelled') THEN
            RAISE EXCEPTION 'Live participation attribution is frozen' USING ERRCODE='23514'; END IF;
        END IF;
        IF TG_TABLE_NAME='participations' THEN
          IF NEW.team_application_id IS DISTINCT FROM (SELECT team_application_id FROM quest_applications WHERE id=NEW.application_id) THEN RAISE EXCEPTION 'Application/participation team mismatch' USING ERRCODE='23514'; END IF;
        END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER application_team_binding BEFORE INSERT OR UPDATE ON quest_applications FOR EACH ROW EXECUTE FUNCTION dniproxp_application_team_binding();
      CREATE TRIGGER participation_team_binding BEFORE INSERT OR UPDATE ON participations FOR EACH ROW EXECUTE FUNCTION dniproxp_application_team_binding();
      CREATE FUNCTION dniproxp_team_application_frozen() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF (to_jsonb(NEW)-'status'-'reviewed_at'-'reviewed_by_user_id'-'review_reason') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'reviewed_at'-'reviewed_by_user_id'-'review_reason') THEN
          RAISE EXCEPTION 'Submitted team composition is immutable' USING ERRCODE='23514'; END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER team_application_frozen BEFORE UPDATE ON team_quest_applications FOR EACH ROW EXECUTE FUNCTION dniproxp_team_application_frozen();
      CREATE FUNCTION dniproxp_attribute_team_verification() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE gid uuid;
      BEGIN
        SELECT team_application_id INTO gid FROM participations WHERE id=NEW.participation_id;
        IF gid IS NOT NULL THEN
          INSERT INTO team_activity_attributions(team_id,team_application_id,membership_id,verified_activity_id,participation_id,user_id,quest_id)
            SELECT team_id,gid,membership_id,NEW.id,NEW.participation_id,NEW.user_id,NEW.quest_id FROM team_quest_application_members
            WHERE team_application_id=gid AND user_id=NEW.user_id;
          IF NOT FOUND THEN RAISE EXCEPTION 'Missing team verification provenance' USING ERRCODE='23514'; END IF;
          INSERT INTO audit_logs(actor_user_id,action,target_type,target_id,metadata)
            SELECT NEW.verified_by_user_id,'TEAM_CONTRIBUTION_VERIFIED','team_activity_attribution',a.id,
              jsonb_build_object('teamId',a.team_id,'teamApplicationId',gid,'verifiedActivityId',NEW.id,'userId',NEW.user_id,'questId',NEW.quest_id)
            FROM team_activity_attributions a WHERE a.verified_activity_id=NEW.id;
        END IF;RETURN NEW;
      END; $$;
      CREATE TRIGGER verified_team_attribution AFTER INSERT ON verified_activities FOR EACH ROW EXECUTE FUNCTION dniproxp_attribute_team_verification();
      CREATE TABLE skill_definitions (
        id uuid PRIMARY KEY,slug varchar NOT NULL UNIQUE,title varchar NOT NULL,description text NOT NULL,category varchar NOT NULL,icon varchar NOT NULL,
        status varchar NOT NULL CHECK(status IN ('ACTIVE','ARCHIVED')),level_thresholds integer[] NOT NULL,
        eligible_quest_categories text[] NOT NULL,prerequisites jsonb NOT NULL,experience_rules jsonb NOT NULL,
        CHECK(cardinality(level_thresholds)=5 AND level_thresholds[1]=0 AND level_thresholds[2]>0 AND level_thresholds[3]>level_thresholds[2] AND level_thresholds[4]>level_thresholds[3] AND level_thresholds[5]>level_thresholds[4]),
        CHECK(jsonb_typeof(prerequisites)='array' AND jsonb_typeof(experience_rules)='object')
      );
      CREATE VIEW user_skill_evidence AS SELECT md5(d.id::text||v.id::text)::uuid AS id,v.user_id,d.id AS skill_id,v.id AS source_activity_id,v.quest_id,
        (d.experience_rules->>'baseXp')::numeric+v.verified_minutes::numeric/60*(d.experience_rules->>'xpPerHour')::numeric AS earned_xp,
        v.verified_minutes,v.verified_at AS confirmed_at
        FROM skill_definitions d JOIN verified_activities v ON v.category_id=ANY(d.eligible_quest_categories)
        WHERE v.verified_minutes IS NOT NULL AND (NOT (d.experience_rules->>'requiresTeam')::boolean OR EXISTS(SELECT 1 FROM team_activity_attributions a WHERE a.verified_activity_id=v.id));
      CREATE TABLE achievement_definitions (
        id uuid PRIMARY KEY,slug varchar NOT NULL UNIQUE,title varchar NOT NULL,description text NOT NULL,icon varchar NOT NULL,tier varchar NOT NULL,
        scope varchar NOT NULL CHECK(scope IN ('USER','TEAM')),status varchar NOT NULL CHECK(status IN ('ACTIVE','ARCHIVED')),requirements jsonb NOT NULL CHECK(jsonb_typeof(requirements)='object')
      );
      CREATE TABLE user_achievement_unlocks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id) ON DELETE RESTRICT,team_id uuid REFERENCES teams(id) ON DELETE RESTRICT,
        achievement_id uuid REFERENCES achievement_definitions(id) ON DELETE RESTRICT,progress_claim_id uuid UNIQUE REFERENCES progress_reward_claims(id) ON DELETE RESTRICT,
        badge jsonb NOT NULL CHECK(jsonb_typeof(badge)='object'),evidence_ids jsonb NOT NULL CHECK(jsonb_typeof(evidence_ids)='array'),
        unlocked_at timestamptz NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK((user_id IS NULL)<>(team_id IS NULL)),
        CHECK((achievement_id IS NULL)<>(progress_claim_id IS NULL)),UNIQUE(user_id,achievement_id),UNIQUE(team_id,achievement_id)
      );
      CREATE INDEX unlocks_user ON user_achievement_unlocks(user_id,unlocked_at,id);
      CREATE INDEX unlocks_team ON user_achievement_unlocks(team_id,unlocked_at,id);
    `);
    for (const skill of SKILLS_V1) await runner.query(`INSERT INTO skill_definitions(id,slug,title,description,category,icon,status,level_thresholds,eligible_quest_categories,prerequisites,experience_rules) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)`, [skill.id, skill.slug, skill.title, skill.description, skill.category, skill.icon, skill.status, skill.levelThresholds, skill.eligibleQuestCategories, JSON.stringify(skill.prerequisites), JSON.stringify(skill.experienceRules)]);
    for (const a of ACHIEVEMENTS_V1) await runner.query(`INSERT INTO achievement_definitions(id,slug,title,description,icon,tier,scope,status,requirements) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [a.id, a.slug, a.title, a.description, a.icon, a.tier, a.scope, a.status, JSON.stringify(a.requirements)]);
    await runner.query(`
      CREATE FUNCTION dniproxp_evaluate_identity(uid uuid,tid uuid) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE d achievement_definitions; evidence jsonb; moment timestamptz; actual numeric;
      BEGIN
        IF uid IS NOT NULL THEN
          PERFORM id FROM users WHERE id=uid FOR UPDATE;
          FOR d IN SELECT * FROM achievement_definitions WHERE scope='USER' AND status='ACTIVE' LOOP
            SELECT count(*),COALESCE(jsonb_agg(id ORDER BY verified_at,id),'[]'),max(verified_at) INTO actual,evidence,moment
              FROM (SELECT id,verified_at FROM verified_activities WHERE user_id=uid ORDER BY verified_at,id LIMIT (d.requirements->>'target')::integer) proof;
            IF actual>=(d.requirements->>'target')::numeric THEN
              INSERT INTO user_achievement_unlocks(user_id,achievement_id,badge,evidence_ids,unlocked_at)
                VALUES(uid,d.id,jsonb_build_object('id',d.id,'title',d.title,'description',d.description,'icon',d.icon),evidence,moment) ON CONFLICT DO NOTHING;
            END IF;
          END LOOP;
          INSERT INTO user_achievement_unlocks(user_id,progress_claim_id,badge,evidence_ids,unlocked_at)
            SELECT uid,id,achievement,evidence_ids,claimed_at FROM progress_reward_claims WHERE user_id=uid ON CONFLICT DO NOTHING;
        END IF;
        IF tid IS NOT NULL THEN
          INSERT INTO team_progress_locks(team_id) VALUES(tid) ON CONFLICT DO NOTHING;
          PERFORM team_id FROM team_progress_locks WHERE team_id=tid FOR UPDATE;
          FOR d IN SELECT * FROM achievement_definitions WHERE scope='TEAM' AND status='ACTIVE' LOOP
            SELECT CASE d.requirements->>'kind'
              WHEN 'TEAM_HOURS' THEN COALESCE(sum(v.verified_minutes),0)::numeric/60
              WHEN 'TEAM_CATEGORY_QUESTS' THEN count(DISTINCT v.quest_id)::numeric ELSE count(*)::numeric END,
              COALESCE(jsonb_agg(v.id ORDER BY v.verified_at,v.id),'[]'),max(v.verified_at) INTO actual,evidence,moment
              FROM team_activity_attributions a JOIN verified_activities v ON v.id=a.verified_activity_id WHERE a.team_id=tid
                AND (d.requirements->>'kind'<>'TEAM_CATEGORY_QUESTS' OR v.category_id=d.requirements->>'category');
            IF actual>=(d.requirements->>'target')::numeric THEN
              INSERT INTO user_achievement_unlocks(team_id,achievement_id,badge,evidence_ids,unlocked_at)
                VALUES(tid,d.id,jsonb_build_object('id',d.id,'title',d.title,'description',d.description,'icon',d.icon),evidence,moment) ON CONFLICT DO NOTHING;
            END IF;
          END LOOP;
        END IF;
      END; $$;
      CREATE FUNCTION dniproxp_identity_verified() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE tid uuid;
      BEGIN
        SELECT team_id INTO tid FROM team_activity_attributions WHERE verified_activity_id=NEW.id;
        PERFORM dniproxp_evaluate_identity(NEW.user_id,tid);RETURN NEW;
      END; $$;
      CREATE TRIGGER zz_identity_verified AFTER INSERT ON verified_activities FOR EACH ROW EXECUTE FUNCTION dniproxp_identity_verified();
      CREATE FUNCTION dniproxp_identity_claimed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        PERFORM dniproxp_evaluate_identity(NEW.user_id,NULL);RETURN NEW;
      END; $$;
      CREATE TRIGGER identity_progress_claim AFTER INSERT ON progress_reward_claims FOR EACH ROW EXECUTE FUNCTION dniproxp_identity_claimed();
      CREATE FUNCTION dniproxp_unlock_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO audit_logs(action,target_type,target_id,metadata) VALUES('ACHIEVEMENT_UNLOCKED','achievement_unlock',NEW.id,
          jsonb_build_object('userId',NEW.user_id,'teamId',NEW.team_id,'achievementId',NEW.achievement_id,'progressClaimId',NEW.progress_claim_id));RETURN NEW;
      END; $$;
      CREATE TRIGGER achievement_audit AFTER INSERT ON user_achievement_unlocks FOR EACH ROW EXECUTE FUNCTION dniproxp_unlock_audit();
      SELECT dniproxp_evaluate_identity(id,NULL) FROM users WHERE EXISTS(SELECT 1 FROM verified_activities WHERE user_id=users.id) OR EXISTS(SELECT 1 FROM progress_reward_claims WHERE user_id=users.id) ORDER BY id;
    `);
    for (const table of ['team_quest_application_members', 'team_activity_attributions', 'skill_definitions', 'achievement_definitions', 'user_achievement_unlocks']) await runner.query(`CREATE TRIGGER ${table}_immutable BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();CREATE TRIGGER ${table}_no_truncate BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only()`);
    for (const table of ['teams', 'team_memberships', 'team_invitations', 'team_join_requests', 'team_quest_applications']) await runner.query(`CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION dniproxp_append_only();CREATE TRIGGER ${table}_no_truncate BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION dniproxp_append_only()`);
  }
  async down(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive) throw new Error('BE-04 downgrade requires a transaction');
    await runner.query(`
      LOCK TABLE verified_activities,progress_reward_claims,quest_applications,participations,teams,team_memberships,team_quest_applications,user_achievement_unlocks IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN IF EXISTS(SELECT 1 FROM teams) OR EXISTS(SELECT 1 FROM team_activity_attributions) OR EXISTS(SELECT 1 FROM user_achievement_unlocks) THEN
        RAISE EXCEPTION 'BE-04 history exists; use a forward migration instead of destroying it'; END IF; END; $$;
      DROP TRIGGER zz_identity_verified ON verified_activities;DROP TRIGGER verified_team_attribution ON verified_activities;
      DROP TRIGGER identity_progress_claim ON progress_reward_claims;
      DROP TRIGGER applications_seat_guard ON quest_applications;DROP TRIGGER participations_seat_guard ON participations;DROP TRIGGER quest_seat_guard ON quests;
      DROP TRIGGER application_team_binding ON quest_applications;DROP TRIGGER participation_team_binding ON participations;
      DROP VIEW user_skill_evidence,team_application_progress;
      ALTER TABLE participations DROP CONSTRAINT participation_team_roster,DROP COLUMN team_application_id;
      ALTER TABLE quest_applications DROP CONSTRAINT application_team_roster,DROP COLUMN team_application_id;
      DROP TABLE team_activity_attributions,team_quest_application_members,team_quest_applications,team_invitations,team_join_requests,team_progress_locks,team_memberships,teams,user_achievement_unlocks,achievement_definitions,skill_definitions;
      DROP FUNCTION dniproxp_unlock_audit(),dniproxp_identity_claimed(),dniproxp_identity_verified(),dniproxp_evaluate_identity(uuid,uuid),dniproxp_attribute_team_verification(),dniproxp_validate_team_attribution(),dniproxp_team_application_frozen(),dniproxp_application_team_binding(),dniproxp_team_roster_count(),dniproxp_quest_seats(),dniproxp_team_captain(),dniproxp_team_guard(),dniproxp_team_capacity();
    `);
  }
}
