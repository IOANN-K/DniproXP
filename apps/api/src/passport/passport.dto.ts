import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';
import { PreferencesDto } from '../users/users.dto.js';
import { AchievementUnlockDto } from '../achievements/achievements.dto.js';
import { PublicSkillProgressDto,SkillProgressDto } from '../skills/skills.dto.js';
import { DistributionDto } from '../teams/team.dto.js';
export class PassportSummaryDto {
  @ApiProperty() userId: string; @ApiProperty() passportId: string;
  @ApiPropertyOptional() displayName?: string; @ApiPropertyOptional({ type: String,nullable: true }) avatar?: string | null; @ApiPropertyOptional({ type: String,nullable: true }) bio?: string | null;
  @ApiProperty() joinDate: string; @ApiProperty({ type: String,nullable: true }) volunteerSince: string | null;
  @ApiProperty() volunteerLevel: number; @ApiProperty() totalXp: number; @ApiProperty() completedQuests: number;
}
export class PassportStatsDto {
  @ApiProperty() completedQuests: number;
  @ApiPropertyOptional({ type: Number,nullable: true }) verifiedHours?: number | null; @ApiPropertyOptional() unknownMinutesCount?: number;
  @ApiPropertyOptional() organizations?: number;
  @ApiPropertyOptional({ type: [DistributionDto] }) categories?: DistributionDto[];
  @ApiPropertyOptional({ type: [DistributionDto] }) districts?: DistributionDto[];
}
export class PublicPassportActivityDto {
  @ApiProperty() id: string; @ApiProperty() questId: string; @ApiProperty() title: string; @ApiProperty() confirmedAt: string;
  @ApiProperty() credentialId: string; @ApiPropertyOptional({ type: Number,nullable: true }) hours?: number | null;
}
export class PassportActivityDto extends PublicPassportActivityDto {
  @ApiProperty() sourceActivityId: string; @ApiProperty() receiptId: string; @ApiProperty() verificationStatus: string;
}
export class PassportActivityPageDto { @ApiProperty({ type: [PassportActivityDto] }) items: PassportActivityDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class PassportOrganizationDto { @ApiProperty() organizationId: string; @ApiProperty() name: string; @ApiProperty() completedQuests: number; @ApiPropertyOptional({ type: Number,nullable: true }) verifiedHours?: number | null; }
export class PassportTeamDto { @ApiProperty() id: string; @ApiProperty() slug: string; @ApiProperty() name: string; @ApiProperty() role: string; @ApiProperty() joinedAt: string; }
export class PassportPublicContentDto extends PassportSummaryDto {
  @ApiProperty({ type: PassportStatsDto }) statistics: PassportStatsDto;
  @ApiPropertyOptional({ type: [AchievementUnlockDto] }) achievements?: AchievementUnlockDto[];
  @ApiPropertyOptional({ type: [PublicSkillProgressDto] }) skillProgress?: PublicSkillProgressDto[];
  @ApiPropertyOptional({ type: [PassportOrganizationDto] }) organizationExperience?: PassportOrganizationDto[];
  @ApiPropertyOptional({ type: [PassportTeamDto] }) teams?: PassportTeamDto[];
  @ApiPropertyOptional({ type: [PublicPassportActivityDto] }) activityHistory?: PublicPassportActivityDto[];
  @ApiPropertyOptional() achievementsTotal?: number; @ApiPropertyOptional() skillsTotal?: number; @ApiPropertyOptional() organizationsTotal?: number; @ApiPropertyOptional() teamsTotal?: number;
}
export class PublicPassportDto { @ApiProperty() restricted: boolean; @ApiPropertyOptional({ type: PassportPublicContentDto }) passport?: PassportPublicContentDto; }
export class PassportReceiptPreviewDto { @ApiProperty() id: string; @ApiProperty() publicReference: string; @ApiProperty() questId: string; @ApiProperty() verifiedAt: string; @ApiProperty({ type: Number,nullable: true }) verifiedMinutes: number | null; }
export class PrivatePassportDto extends PassportSummaryDto {
  @ApiProperty({ type: PassportStatsDto }) statistics: PassportStatsDto;
  @ApiProperty({ type: [AchievementUnlockDto] }) achievements: AchievementUnlockDto[]; @ApiProperty() achievementsTotal: number;
  @ApiProperty({ type: [SkillProgressDto] }) skillProgress: SkillProgressDto[]; @ApiProperty() skillsTotal: number;
  @ApiProperty({ type: [PassportOrganizationDto] }) organizationExperience: PassportOrganizationDto[]; @ApiProperty() organizationsTotal: number;
  @ApiProperty({ type: [PassportTeamDto] }) teams: PassportTeamDto[]; @ApiProperty() teamsTotal: number;
  @ApiProperty({ type: [PassportActivityDto] }) activityHistory: PassportActivityDto[];
  @ApiProperty({ type: [PassportReceiptPreviewDto] }) receipts: PassportReceiptPreviewDto[]; @ApiProperty() receiptsTotal: number;
  @ApiProperty({ type: PreferencesDto }) visibilitySettings: PreferencesDto;
  @ApiProperty() rewardPointsBalance: number;
}
