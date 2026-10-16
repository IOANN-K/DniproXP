import type { SkillLevel } from './skill.entity.js';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto.js';
export class IdentityPageQueryDto extends PickType(PaginationDto,['page','pageSize','order']) {}
export class SkillPrerequisiteDto { @ApiProperty() skillId: string; @ApiProperty() minLevel: number; }
export class ExperienceRulesDto { @ApiProperty() baseXp: number; @ApiProperty() xpPerHour: number; @ApiProperty() requiresTeam: boolean; }
export class SkillDefinitionDto {
  @ApiProperty() id: string; @ApiProperty() slug: string; @ApiProperty() name: string; @ApiProperty() title: string; @ApiProperty() description: string;
  @ApiProperty() category: string; @ApiProperty() icon: string; @ApiProperty() status: string; @ApiProperty({ type: [Number] }) levelThresholds: number[];
  @ApiProperty({ type: [String] }) eligibleQuestCategories: string[]; @ApiProperty({ type: [String] }) prerequisiteSkillIds: string[];
  @ApiProperty({ type: [SkillPrerequisiteDto] }) prerequisites: SkillPrerequisiteDto[]; @ApiProperty({ type: ExperienceRulesDto }) experienceRules: ExperienceRulesDto;
}
export class SkillDefinitionPageDto { @ApiProperty({ type: [SkillDefinitionDto] }) items: SkillDefinitionDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class SkillEvidenceDto {
  @ApiProperty() id: string; @ApiProperty() skillId: string; @ApiProperty() sourceActivityId: string; @ApiProperty() questId: string;
  @ApiProperty() questTitle: string; @ApiProperty() earnedXp: number; @ApiProperty() hours: number; @ApiProperty() confirmedAt: string;
}
export class SkillEvidencePageDto { @ApiProperty({ type: [SkillEvidenceDto] }) items: SkillEvidenceDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class SkillProgressDto {
  @ApiProperty({ type: String,nullable: true }) updatedAt: string | null;
  @ApiProperty() skillId: string; @ApiProperty() userId: string; @ApiProperty() earnedXp: number; @ApiProperty({ enum: [0,1,2,3,4] }) level: SkillLevel;
  @ApiProperty() unlocked: boolean; @ApiProperty() percentage: number; @ApiProperty({ type: Number,nullable: true }) nextLevelXp: number | null;
  @ApiProperty({ type: [SkillEvidenceDto] }) evidence: SkillEvidenceDto[]; @ApiProperty() evidenceTotal: number; @ApiProperty() hasMoreEvidence: boolean;
  @ApiProperty({ type: [String] }) lockReasons: string[]; @ApiProperty({ example: 'VERIFIED' }) evidenceStatus: string;
}
export class PublicSkillProgressDto {
  @ApiProperty() evidenceStatus: string;
  @ApiProperty() skillId: string; @ApiProperty({ enum: [0,1,2,3,4] }) level: SkillLevel; @ApiProperty() unlocked: boolean;
  @ApiPropertyOptional() earnedXp?: number; @ApiPropertyOptional() percentage?: number; @ApiPropertyOptional({ type: Number,nullable: true }) nextLevelXp?: number | null;
}
export class SkillProgressPageDto { @ApiProperty({ type: [SkillProgressDto] }) items: SkillProgressDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class PublicSkillPageDto { @ApiProperty() restricted: boolean; @ApiPropertyOptional({ type: [PublicSkillProgressDto] }) items?: PublicSkillProgressDto[]; @ApiPropertyOptional() total?: number; @ApiPropertyOptional() page?: number; @ApiPropertyOptional() pageSize?: number; }
