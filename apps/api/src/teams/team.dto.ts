import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsString, IsUUID, Length, Max, Min, ValidateIf } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import { categories } from '../progress/domain.js';
import type { JoinPolicy } from './team.entity.js';
export class TeamQueryDto extends PickType(PaginationDto, ['page','pageSize','order','search']) {
  @ApiPropertyOptional({ enum: categories }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(categories) category?: string;
}
export class TeamHistoryQueryDto extends PickType(PaginationDto,['page','pageSize','order']) {}
export class TeamMemberQueryDto extends PickType(PaginationDto,['page','pageSize']) {}
export class TeamPeriodQueryDto {
  @ApiPropertyOptional({ enum: ['all','month'],default: 'all' }) @IsIn(['all','month']) period: 'all' | 'month' = 'all';
}
export class TeamPeriodPageQueryDto extends TeamHistoryQueryDto {
  @ApiPropertyOptional({ enum: ['all','month'],default: 'all' }) @IsIn(['all','month']) period: 'all' | 'month' = 'all';
}
export class TeamLeaderboardQueryDto extends PickType(TeamPeriodPageQueryDto,['page','pageSize','period']) {}
export class TeamRankingQueryDto extends TeamLeaderboardQueryDto {
  @ApiPropertyOptional({ enum: categories }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(categories) category?: string;
}
export class TeamFormDto {
  @ApiProperty() @Transform(trim) @IsString() @Length(3,70) name: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(30,1500) description: string;
  @ApiProperty({ enum: categories }) @IsIn(categories) category: string;
  @ApiProperty({ enum: ['Дніпро'] }) @IsIn(['Дніпро']) city: string;
  @ApiProperty({ enum: ['leaf','heart','flag','sun'] }) @IsIn(['leaf','heart','flag','sun']) avatar: string;
  @ApiProperty({ enum: ['/images/nature.jpg','/images/community.jpg','/images/books.jpg','/images/dogs.jpg'] }) @IsIn(['/images/nature.jpg','/images/community.jpg','/images/books.jpg','/images/dogs.jpg']) coverImage: string;
  @ApiProperty({ enum: ['PUBLIC','PRIVATE'] }) @IsIn(['PUBLIC','PRIVATE']) visibility: 'PUBLIC' | 'PRIVATE';
  @ApiProperty({ minimum: 2,maximum: 50 }) @IsInt() @Min(2) @Max(50) maxMembers: number;
  @ApiPropertyOptional({ enum: ['OPEN','APPROVAL','INVITE_ONLY'] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(['OPEN','APPROVAL','INVITE_ONLY']) joinPolicy?: JoinPolicy;
}
export class UpdateTeamDto extends PartialType(TeamFormDto, { skipNullProperties: false }) {}
export class TargetUserDto { @ApiProperty({ format: 'uuid' }) @IsUUID('4') userId: string; }
export class MemberRoleDto extends TargetUserDto { @ApiProperty({ enum: ['MANAGER','MEMBER'] }) @IsIn(['MANAGER','MEMBER']) role: 'MANAGER' | 'MEMBER'; }
export class TeamApplicationInputDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') teamId: string;
  @ApiProperty({ type: [String], minItems: 1,maxItems: 50 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @IsUUID('4',{ each: true }) participantIds: string[];
  @ApiProperty({ format: 'uuid', description: 'Стабільний UUID команди для повтору HTTP-запиту' }) @IsUUID('4') operationId: string;
}
export class TeamDto {
  @ApiProperty() id: string; @ApiProperty() slug: string; @ApiProperty() name: string; @ApiProperty() description: string;
  @ApiProperty() avatar: string; @ApiProperty() coverImage: string; @ApiProperty() category: string; @ApiProperty() city: string;
  @ApiProperty() visibility: string; @ApiProperty() joinPolicy: string; @ApiProperty() maxMembers: number; @ApiProperty() memberCount: number;
  @ApiProperty() status: string; @ApiProperty() createdAt: string; @ApiProperty() updatedAt: string;
  @ApiPropertyOptional({ type: Number,nullable: true }) totalVerifiedHours?: number | null;
  @ApiPropertyOptional() totalCompletedQuests?: number; @ApiPropertyOptional() totalXP?: number;
  @ApiPropertyOptional({ description: 'Лише scoped учасникам/власнику' }) ownerId?: string;
  @ApiPropertyOptional() captainUserId?: string;
}
export class TeamPageDto { @ApiProperty({ type: [TeamDto] }) items: TeamDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class MemberDto {
  @ApiProperty() id: string; @ApiProperty() teamId: string; @ApiProperty() userId: string; @ApiProperty() displayName: string;
  @ApiProperty({ type: String,nullable: true }) avatarUrl: string | null; @ApiProperty() role: string; @ApiProperty() status: string; @ApiProperty() joinedAt: string;
}
export class MemberPageDto { @ApiProperty({ type: [MemberDto] }) items: MemberDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class InvitationDto {
  @ApiProperty() id: string; @ApiProperty() teamId: string; @ApiProperty() invitedUserId: string; @ApiProperty() invitedBy: string;
  @ApiProperty() status: string; @ApiProperty() createdAt: string; @ApiProperty() expiresAt: string; @ApiProperty({ type: String,nullable: true }) resolvedAt: string | null;
}
export class InvitationPageDto { @ApiProperty({ type: [InvitationDto] }) items: InvitationDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class JoinRequestDto {
  @ApiProperty() id: string; @ApiProperty() teamId: string; @ApiProperty() userId: string; @ApiProperty() status: string; @ApiProperty() createdAt: string;
  @ApiProperty({ type: String,nullable: true }) reason: string | null; @ApiProperty({ type: String,nullable: true }) reviewedAt: string | null; @ApiProperty({ type: String,nullable: true }) reviewedBy: string | null;
}
export class JoinRequestPageDto { @ApiProperty({ type: [JoinRequestDto] }) items: JoinRequestDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class TeamApplicationParticipantDto {
  @ApiProperty() userId: string; @ApiProperty() membershipId: string; @ApiProperty() applicationId: string;
  @ApiProperty() participantStatus: string; @ApiProperty({ type: String,nullable: true }) participationId: string | null;
}
export class TeamApplicationDto {
  @ApiProperty() id: string; @ApiProperty() teamId: string; @ApiProperty() questId: string; @ApiProperty() submittedByUserId: string;
  @ApiProperty() status: string; @ApiProperty() participantCount: number; @ApiProperty() submittedAt: string;
  @ApiProperty({ type: String,nullable: true }) reviewedAt: string | null; @ApiProperty({ type: String,nullable: true }) reviewedBy: string | null;
  @ApiProperty({ type: String,nullable: true }) reviewReason: string | null; @ApiProperty({ type: [TeamApplicationParticipantDto] }) participants: TeamApplicationParticipantDto[];
}
export class TeamApplicationPageDto { @ApiProperty({ type: [TeamApplicationDto] }) items: TeamApplicationDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class DistributionDto { @ApiProperty() key: string; @ApiProperty() contributions: number; @ApiProperty({ type: Number,nullable: true }) hours: number | null; }
export class SharedImpactDto {
  @ApiProperty() metric: string; @ApiProperty() unit: string; @ApiProperty({ type: Number,nullable: true }) value: number | null;
  @ApiProperty({ example: 'QUEST_SHARED_NOT_ADDITIVE' }) provenance: string;
}
export class TeamStatisticsDto {
  @ApiProperty() teamId: string; @ApiProperty() activeMembers: number; @ApiProperty() verifiedQuests: number; @ApiProperty() completedQuests: number;
  @ApiProperty() verifiedParticipations: number; @ApiProperty() volunteers: number; @ApiProperty() xp: number;
  @ApiProperty({ type: Number,nullable: true }) hours: number | null; @ApiProperty() unknownMinutesCount: number;
  @ApiProperty({ type: [DistributionDto] }) categories: DistributionDto[]; @ApiProperty({ type: [DistributionDto] }) districts: DistributionDto[];
  @ApiProperty({ type: [DistributionDto] }) trends: DistributionDto[]; @ApiProperty({ type: [SharedImpactDto] }) impacts: SharedImpactDto[];
}
export class TeamContributionDto {
  @ApiProperty() id: string; @ApiProperty() teamId: string; @ApiPropertyOptional() teamApplicationId?: string; @ApiProperty() userId: string;
  @ApiProperty() questId: string; @ApiProperty() title: string; @ApiProperty() verifiedAt: string;
  @ApiProperty({ type: Number,nullable: true }) hours: number | null; @ApiProperty() xp: number;
}
export class TeamContributionPageDto { @ApiProperty({ type: [TeamContributionDto] }) items: TeamContributionDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class TeamRankDto { @ApiProperty() userId: string; @ApiProperty() displayName: string; @ApiProperty() hours: number; @ApiProperty() participations: number; @ApiProperty() rank: number; }
export class TeamLeaderboardDto { @ApiProperty({ type: [TeamRankDto] }) items: TeamRankDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class TeamRankingEntryDto { @ApiProperty({ type: TeamDto }) team: TeamDto; @ApiProperty() rank: number; @ApiProperty({ type: Number,nullable: true }) hours: number | null; @ApiProperty() verifiedParticipations: number; @ApiProperty() currentMonthBadge: boolean; }
export class TeamRankingDto { @ApiProperty({ type: [TeamRankingEntryDto] }) items: TeamRankingEntryDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class TeamCommandResultDto { @ApiProperty() teamId: string; @ApiProperty({ type: Boolean,example: true }) success: true; }
