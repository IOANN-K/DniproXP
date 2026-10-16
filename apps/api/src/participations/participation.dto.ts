import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto, PageMetaDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import {
  ApplicationStatus,
  ParticipationStatus,
  ReportStatus,
} from '../quests/domain.js';
import { QuestDto } from '../quests/quests.dto.js';
import { LedgerEntryDto } from '../ledger/ledger.dto.js';
export class ApplicationQueryDto extends PickType(PaginationDto, [
  'page',
  'pageSize',
  'order',
]) {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
export class ParticipationQueryDto extends PickType(PaginationDto, [
  'page',
  'pageSize',
  'order',
]) {
  @ApiPropertyOptional({ enum: ParticipationStatus })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(ParticipationStatus)
  status?: ParticipationStatus;
}
export class ReportQueryDto extends PickType(PaginationDto, [
  'page',
  'pageSize',
  'order',
]) {}
export class CreateReportDto {
  @ApiProperty({ minLength: 30, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @Length(30, 2000)
  description: string;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 1440,
    description:
      'Actual measured minutes, never planned duration; null means unknown',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  reportedMinutes?: number | null;
  @ApiPropertyOptional({
    type: [String],
    maxItems: 0,
    description:
      'BE-02 has no trusted media storage: only an empty array is accepted',
  })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(0)
  @IsString({ each: true })
  evidenceReferences?: string[];
}
export class CancelParticipationDto {
  @ApiPropertyOptional({
    minLength: 5,
    maxLength: 1000,
    description: 'Required for organizer cancellation of active participation',
  })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @Length(5, 1000)
  reason?: string;
}
export class ApplicationDto {
  @ApiProperty({ type: String,nullable: true,format: 'uuid' }) teamApplicationId: string | null;
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) questId: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ enum: ApplicationStatus }) status: ApplicationStatus;
  @ApiProperty({ type: String, nullable: true }) reason: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  reviewedByUserId: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  reviewedAt: string | null;
  @ApiProperty({ format: 'date-time' }) submittedAt: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({
    type: QuestDto,
    description:
      'Authorized history snapshot; no other applications or reports',
  })
  quest: QuestDto;
}
export class ReportDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) participationId: string;
  @ApiProperty({ format: 'uuid' }) submittedByUserId: string;
  @ApiProperty() description: string;
  @ApiProperty({ type: Number, nullable: true }) reportedMinutes: number | null;
  @ApiProperty({ type: [String] }) evidenceReferences: string[];
  @ApiProperty({ enum: ReportStatus }) status: ReportStatus;
  @ApiProperty({ format: 'date-time' }) submittedAt: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  reviewedAt: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  reviewedByUserId: string | null;
  @ApiProperty({ type: String, nullable: true }) reviewReason: string | null;
}
export class ParticipationDto {
  @ApiProperty({ type: String,nullable: true,format: 'uuid' }) teamApplicationId: string | null;
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) applicationId: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ format: 'uuid' }) questId: string;
  @ApiProperty({ enum: ParticipationStatus }) status: ParticipationStatus;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  confirmedAt: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ type: QuestDto }) quest: QuestDto;
  @ApiProperty({ enum: ApplicationStatus })
  applicationStatus: ApplicationStatus;
  @ApiProperty({ type: Number, nullable: true }) awardedXp: number | null;
  @ApiProperty({ type: Number, nullable: true }) awardedPoints: number | null;
}
export class VerifiedActivityDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ format: 'uuid' }) questId: string;
  @ApiProperty({ format: 'uuid' }) organizationId: string;
  @ApiProperty({ format: 'uuid' }) participationId: string;
  @ApiProperty({ format: 'uuid' }) reportId: string;
  @ApiProperty({ type: Number, nullable: true }) verifiedMinutes: number | null;
  @ApiProperty() xpAwarded: number;
  @ApiProperty() rewardPointsAwarded: number;
  @ApiProperty() categoryId: string;
  @ApiProperty() district: string;
  @ApiProperty() sourceEventId: string;
  @ApiProperty({ format: 'uuid' }) verifiedByUserId: string;
  @ApiProperty({ format: 'date-time' }) verifiedAt: string;
}
export class VerificationDto {
  @ApiProperty({ type: ReportDto }) report: ReportDto;
  @ApiProperty({ type: VerifiedActivityDto }) activity: VerifiedActivityDto;
  @ApiProperty({ type: [LedgerEntryDto] }) transactions: LedgerEntryDto[];
}
export class ApplicationPageDto {
  @ApiProperty({ type: [ApplicationDto] }) items: ApplicationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
export class ParticipationPageDto {
  @ApiProperty({ type: [ParticipationDto] }) items: ParticipationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
export class ReportPageDto {
  @ApiProperty({ type: [ReportDto] }) items: ReportDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
