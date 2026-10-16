import { Column,CreateDateColumn,Entity,PrimaryGeneratedColumn,UpdateDateColumn,Unique } from 'typeorm';
import type { MissionRules,ChallengeRules,StoryBadge,MissionStatus,ChallengeStatus } from './domain.js';
abstract class Definition {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'organization_id'}) organizationId:string;
 @Column({type:'varchar',length:100}) slug:string;
 @Column({type:'varchar',length:150}) title:string;
 @Column({type:'text'}) description:string;
 @Column({type:'varchar'}) category:string;
 @Column({type:'text',name:'cover_image'}) coverImage:string;
 @Column({type:'integer',name:'reward_xp'}) rewardXp:number;
 @Column({type:'integer',name:'reward_points'}) rewardPoints:number;
 @Column({type:'jsonb'}) achievement:StoryBadge;
 @Column({type:'timestamptz',name:'starts_at',nullable:true}) startsAt:Date|null;
 @Column({type:'timestamptz',name:'ends_at',nullable:true}) endsAt:Date|null;
 @Column({type:'text',name:'seed_key',nullable:true,select:false}) seedKey:string|null;
 @CreateDateColumn({type:'timestamptz',name:'created_at'}) createdAt:Date;
 @UpdateDateColumn({type:'timestamptz',name:'updated_at'}) updatedAt:Date;
}
@Entity('mission_definitions') @Unique('mission_slug_unique',['slug'])
export class MissionDefinition extends Definition {
 @Column({type:'varchar',default:'DRAFT'}) status:MissionStatus;
 @Column({type:'varchar',length:240,name:'short_description'}) shortDescription:string;
 @Column({type:'varchar'}) difficulty:string;
 @Column({type:'varchar',length:200,name:'estimated_duration'}) estimatedDuration:string;
 @Column({type:'jsonb'}) rules:MissionRules;
}
@Entity('challenge_definitions') @Unique('challenge_slug_unique',['slug'])
export class ChallengeDefinition extends Definition {
 @Column({type:'varchar',default:'DRAFT'}) status:ChallengeStatus;
 @Column({type:'jsonb'}) rules:ChallengeRules;
}
@Entity('mission_enrollments') @Unique('mission_enrollment_unique',['missionId','userId'])
export class MissionEnrollment {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'mission_id'}) missionId:string;
 @Column({type:'uuid',name:'user_id'}) userId:string;
 @CreateDateColumn({type:'timestamptz',name:'joined_at'}) joinedAt:Date;
}
@Entity('mission_completions') @Unique('mission_completion_unique',['missionId','userId'])
export class MissionCompletion {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'mission_id'}) missionId:string;
 @Column({type:'uuid',name:'user_id'}) userId:string;
 @Column({type:'timestamptz',name:'completed_at'}) completedAt:Date;
 @Column({type:'jsonb',name:'evidence_ids'}) evidenceIds:string[];
 @CreateDateColumn({type:'timestamptz',name:'recorded_at'}) recordedAt:Date;
}
@Entity('progress_reward_claims') @Unique('progress_claim_unique',['kind','definitionId','userId'])
export class ProgressRewardClaim {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'varchar'}) kind:'mission'|'challenge';
 @Column({type:'uuid',name:'definition_id'}) definitionId:string;
 @Column({type:'uuid',name:'user_id'}) userId:string;
 @Column({type:'integer'}) xp:number;
 @Column({type:'integer',name:'reward_points'}) rewardPoints:number;
 @Column({type:'jsonb'}) achievement:StoryBadge;
 @Column({type:'jsonb',name:'evidence_ids'}) evidenceIds:string[];
 @CreateDateColumn({type:'timestamptz',name:'claimed_at'}) claimedAt:Date;
}
@Entity('challenge_participants') @Unique('challenge_participant_unique',['challengeId','userId'])
export class ChallengeParticipant {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'challenge_id'}) challengeId:string;
 @Column({type:'uuid',name:'user_id'}) userId:string;
 @CreateDateColumn({type:'timestamptz',name:'joined_at'}) joinedAt:Date;
}
@Entity('challenge_milestone_completions') @Unique('challenge_milestone_unique',['challengeId','threshold'])
export class ChallengeMilestoneCompletion {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'challenge_id'}) challengeId:string;
 @Column({type:'integer'}) threshold:number;
 @Column({type:'jsonb',name:'evidence_ids'}) evidenceIds:string[];
 @CreateDateColumn({type:'timestamptz',name:'reached_at'}) reachedAt:Date;
}
