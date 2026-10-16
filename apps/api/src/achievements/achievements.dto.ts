import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';
export class AchievementRequirementsDto { @ApiProperty() kind: string; @ApiProperty() target: number; @ApiPropertyOptional() category?: string; }
export class AchievementDefinitionDto {
  @ApiProperty() id: string; @ApiProperty() slug: string; @ApiProperty() title: string; @ApiProperty() description: string;
  @ApiProperty() icon: string; @ApiProperty() tier: string; @ApiProperty() scope: string; @ApiProperty() status: string;
  @ApiProperty({ type: AchievementRequirementsDto }) requirements: AchievementRequirementsDto;
}
export class AchievementBadgeDto { @ApiProperty() id: string; @ApiProperty() title: string; @ApiProperty() description: string; @ApiPropertyOptional() icon?: string; }
export class AchievementUnlockDto {
  @ApiProperty() id: string; @ApiProperty({ type: AchievementBadgeDto }) badge: AchievementBadgeDto;
  @ApiProperty({ type: String,nullable: true }) achievementId: string | null; @ApiPropertyOptional() unlockedAt?: string;
  @ApiPropertyOptional({ type: [String],description: 'Лише власнику; публічні проєкції не містять proof IDs' }) evidenceIds?: string[];
}
export class AchievementDefinitionPageDto { @ApiProperty({ type: [AchievementDefinitionDto] }) items: AchievementDefinitionDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class AchievementUnlockPageDto { @ApiProperty({ type: [AchievementUnlockDto] }) items: AchievementUnlockDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class PublicAchievementPageDto { @ApiProperty() restricted: boolean; @ApiPropertyOptional({ type: [AchievementUnlockDto] }) items?: AchievementUnlockDto[]; @ApiPropertyOptional() total?: number; @ApiPropertyOptional() page?: number; @ApiPropertyOptional() pageSize?: number; }
export class TeamAchievementDto { @ApiProperty() id: string; @ApiProperty() title: string; @ApiProperty() description: string; @ApiProperty() value: number; @ApiProperty() target: number; @ApiProperty() unlocked: boolean; @ApiProperty({ type: String,nullable: true }) unlockedAt: string | null; @ApiProperty() periodic: boolean; }
