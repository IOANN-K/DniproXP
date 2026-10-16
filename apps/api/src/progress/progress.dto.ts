import { Type,Transform } from 'class-transformer';
import { IsArray,ArrayMaxSize,ArrayUnique,IsBoolean,IsIn,IsInt,IsISO8601,IsNumber,IsOptional,IsString,IsUUID,Length,Matches,Max,MaxLength,Min,ValidateIf,ValidateNested,IsDefined } from 'class-validator';
import { ApiProperty,ApiPropertyOptional,OmitType,PickType } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import { categories,goalMetrics } from './domain.js';
import type { CategoryId,GoalMetric } from './domain.js';
export class LeaderboardQueryDto extends PickType(PaginationDto,['page','pageSize']) {}
export class ProgressQueryDto extends PickType(PaginationDto,['page','pageSize','order','search']) {
 @ApiPropertyOptional({enum:[...categories,'all']}) @ValidateIf((_o:unknown,v:unknown)=>v!==undefined) @IsIn([...categories,'all']) category?:string;
}
export class BadgeDto {
 @ApiProperty({format:'uuid'}) @IsUUID('4') id:string;
 @ApiProperty() @IsString() @Length(3,100) title:string;
 @ApiProperty() @IsString() @Length(5,500) description:string;
}
export class StoryRewardDto {
 @ApiProperty({minimum:0,maximum:10000}) @IsInt() @Min(0) @Max(10000) xp:number;
 @ApiProperty({minimum:0,maximum:10000}) @IsInt() @Min(0) @Max(10000) rewardPoints:number;
 @ApiProperty({type:BadgeDto}) @IsDefined() @ValidateNested() @Type(()=>BadgeDto) achievement:BadgeDto;
}
class DefinitionInputDto {
 @ApiProperty({format:'uuid'}) @IsUUID('4') organizationId:string;
 @ApiProperty() @IsString() @Length(3,100) @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/) slug:string;
 @ApiProperty() @Transform(trim) @IsString() @Length(3,150) title:string;
 @ApiProperty() @Transform(trim) @IsString() @Length(20,5000) description:string;
 @ApiProperty({enum:[...categories,'all']}) @IsIn([...categories,'all']) category:string;
 @ApiProperty({enum:['/images/community.jpg','/images/nature.jpg','/images/dogs.jpg','/images/books.jpg']}) @IsIn(['/images/community.jpg','/images/nature.jpg','/images/dogs.jpg','/images/books.jpg']) coverImage:string;
 @ApiProperty({type:StoryRewardDto}) @IsDefined() @ValidateNested() @Type(()=>StoryRewardDto) rewards:StoryRewardDto;
 @ApiPropertyOptional({type:String,nullable:true,format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/) startsAt?:string|null;
 @ApiPropertyOptional({type:String,nullable:true,format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/) endsAt?:string|null;
}
export class MissionStepInputDto {
 @ApiProperty({format:'uuid'}) @IsUUID('4') id:string;
 @ApiProperty({format:'uuid'}) @IsUUID('4') questId:string;
 @ApiProperty() @IsString() @Length(3,100) title:string;
 @ApiProperty() @IsString() @MaxLength(1000) description:string;
 @ApiProperty() @IsInt() @Min(1) @Max(1000) order:number;
 @ApiProperty() @IsBoolean() isOptional:boolean;
 @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4',{each:true}) prerequisiteStepIds:string[];
}
export class MissionPrerequisitesDto {
 @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4',{each:true}) chainIds:string[];
 @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4',{each:true}) questIds:string[];
 @ApiProperty() @IsInt() @Min(1) @Max(8) minLevel:number;
}
export class MissionInputDto extends DefinitionInputDto {
 @ApiProperty() @IsString() @Length(3,240) shortDescription:string;
 @ApiProperty({enum:['Легкий','Середній','Складний']}) @IsIn(['Легкий','Середній','Складний']) difficulty:string;
 @ApiProperty() @IsString() @Length(1,200) estimatedDuration:string;
 @ApiProperty({type:[MissionStepInputDto]}) @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>MissionStepInputDto) steps:MissionStepInputDto[];
 @ApiProperty({type:MissionPrerequisitesDto}) @IsDefined() @ValidateNested() @Type(()=>MissionPrerequisitesDto) prerequisites:MissionPrerequisitesDto;
}
export class ChallengeGoalInputDto {
 @ApiProperty({format:'uuid'}) @IsUUID('4') id:string;
 @ApiProperty({enum:goalMetrics}) @IsIn(goalMetrics) metric:GoalMetric;
 @ApiProperty() @IsNumber({maxDecimalPlaces:6,allowNaN:false,allowInfinity:false}) @Min(0.000001) @Max(1000000) targetValue:number;
 @ApiProperty({enum:['год','кг','дерев','од.']}) @IsIn(['год','кг','дерев','од.']) unit:string;
 @ApiProperty() @IsString() @Length(3,1000) description:string;
 @ApiProperty() @IsBoolean() isOptional:boolean;
}
export class ChallengeInputDto extends OmitType(DefinitionInputDto,['startsAt','endsAt']) {
 @ApiProperty({format:'date-time'}) @IsISO8601({strict:true}) @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/) startDate:string;
 @ApiProperty({format:'date-time'}) @IsISO8601({strict:true}) @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/) endDate:string;
 @ApiProperty({type:[ChallengeGoalInputDto]}) @IsArray() @ArrayMaxSize(4) @ValidateNested({each:true}) @Type(()=>ChallengeGoalInputDto) goals:ChallengeGoalInputDto[];
 @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID('4',{each:true}) relatedQuestIds:string[];
 @ApiPropertyOptional({type:[String]}) @IsOptional() @IsArray() @ArrayMaxSize(6) @ArrayUnique() @IsIn(categories,{each:true}) categoryIds?:CategoryId[];
 @ApiPropertyOptional({type:[String]}) @IsOptional() @IsArray() @ArrayMaxSize(50) @ArrayUnique() @IsString({each:true}) @MaxLength(80,{each:true}) districts?:string[];
 @ApiPropertyOptional({type:[String]}) @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4',{each:true}) organizationIds?:string[];
 @ApiPropertyOptional({type:[Number],default:[25,50,75,100]}) @IsOptional() @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsInt({each:true}) @Min(1,{each:true}) @Max(100,{each:true}) milestones?:number[];
}
export class MissionStepDto extends MissionStepInputDto { @ApiProperty({format:'uuid'}) chainId:string; }
export class MissionDefinitionDto extends OmitType(MissionInputDto,['steps']) {
 @ApiProperty({format:'uuid'}) id:string; @ApiProperty() status:string;
 @ApiProperty({type:[MissionStepDto]}) steps:MissionStepDto[];
}
export class ChallengeDefinitionDto extends ChallengeInputDto { @ApiProperty({format:'uuid'}) id:string; @ApiProperty() status:string; @ApiProperty({format:'date-time'}) createdAt:string; }
export class MissionStepProgressDto { @ApiProperty() stepId:string; @ApiProperty({enum:['LOCKED','AVAILABLE','IN_PROGRESS','COMPLETED']}) status:string; @ApiProperty({type:String,nullable:true}) confirmedAt:string|null; @ApiProperty({type:String,nullable:true}) reason:string|null; }
export class MissionProgressDto {
 @ApiProperty() chainId:string; @ApiProperty() userId:string;
 @ApiProperty({enum:['LOCKED','AVAILABLE','IN_PROGRESS','COMPLETED']}) status:'LOCKED'|'AVAILABLE'|'IN_PROGRESS'|'COMPLETED';
 @ApiProperty({type:[MissionStepProgressDto]}) steps:MissionStepProgressDto[];
 @ApiProperty() requiredCompleted:number; @ApiProperty() requiredTotal:number; @ApiProperty() optionalCompleted:number; @ApiProperty() optionalTotal:number;
 @ApiProperty() percentage:number; @ApiProperty({type:String,nullable:true}) nextStepId:string|null; @ApiProperty({type:String,nullable:true}) completedAt:string|null;
 @ApiProperty() rewardClaimed:boolean; @ApiProperty({type:[String]}) reasons:string[]; @ApiProperty() enrolled:boolean;
}
export class GoalProgressDto extends ChallengeGoalInputDto { @ApiProperty({type:Number,nullable:true}) actualValue:number|null; @ApiProperty() percentage:number; @ApiProperty() complete:boolean; }
export class MilestoneDto { @ApiProperty() threshold:number; @ApiProperty() currentlyMet:boolean; @ApiProperty({type:String,nullable:true,format:'date-time'}) reachedAt:string|null; }
export class ChallengeProgressDto {
 @ApiProperty() challengeId:string; @ApiProperty() status:string; @ApiProperty() complete:boolean; @ApiProperty() percentage:number;
 @ApiProperty({type:[GoalProgressDto]}) goals:GoalProgressDto[]; @ApiProperty() contributorCount:number; @ApiProperty() participantCount:number;
 @ApiProperty({type:Number,nullable:true}) hours:number|null; @ApiProperty({type:[MilestoneDto]}) milestones:MilestoneDto[];
}
export class RankingEntryDto { @ApiProperty() userId:string; @ApiProperty() displayName:string; @ApiProperty({type:String,nullable:true}) avatarUrl:string|null; @ApiProperty() hours:number; @ApiProperty() quests:number; @ApiProperty() rank:number; }
export class LeaderboardDto { @ApiProperty({type:[RankingEntryDto]}) items:RankingEntryDto[]; @ApiProperty() page:number; @ApiProperty() pageSize:number; @ApiProperty() total:number; }
export class RewardClaimDto { @ApiProperty() id:string; @ApiProperty() kind:string; @ApiProperty() definitionId:string; @ApiProperty() xp:number; @ApiProperty() rewardPoints:number; @ApiProperty({type:BadgeDto}) achievement:BadgeDto; @ApiProperty({format:'date-time'}) claimedAt:string; }
export class MissionPageDto { @ApiProperty({type:[MissionDefinitionDto]}) items:MissionDefinitionDto[]; @ApiProperty() total:number; @ApiProperty() page:number; @ApiProperty() pageSize:number; }
export class ChallengePageDto { @ApiProperty({type:[ChallengeDefinitionDto]}) items:ChallengeDefinitionDto[]; @ApiProperty() total:number; @ApiProperty() page:number; @ApiProperty() pageSize:number; }
export class UserMissionDto { @ApiProperty({type:MissionDefinitionDto}) mission:MissionDefinitionDto; @ApiProperty({type:MissionProgressDto}) progress:MissionProgressDto; }
export class UserMissionPageDto { @ApiProperty({type:[UserMissionDto]}) items:UserMissionDto[]; @ApiProperty() total:number; @ApiProperty() page:number; @ApiProperty() pageSize:number; }
export class UserChallengeDto { @ApiProperty({type:ChallengeDefinitionDto}) challenge:ChallengeDefinitionDto; @ApiProperty({type:ChallengeProgressDto}) progress:ChallengeProgressDto; @ApiProperty() enrolled:boolean; @ApiProperty() rewardClaimed:boolean; @ApiProperty() ownHours:number; @ApiProperty() ownQuests:number; }
export class UserChallengePageDto { @ApiProperty({type:[UserChallengeDto]}) items:UserChallengeDto[]; @ApiProperty() total:number; @ApiProperty() page:number; @ApiProperty() pageSize:number; }

export class ChallengeJoinDto { @ApiProperty() challengeId:string; @ApiProperty({type:Boolean,example:true}) enrolled:true; }
