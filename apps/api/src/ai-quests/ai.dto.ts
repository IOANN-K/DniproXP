import { ApiProperty,ApiPropertyOptional,PickType } from '@nestjs/swagger';
import { Type,Transform } from 'class-transformer';
import { IsArray,IsEnum,IsIn,IsInt,IsNumber,IsString,IsUUID,Length,Max,Min,ValidateIf,ValidateNested } from 'class-validator';
import { QuestCategory,QuestDifficulty } from '../quests/domain.js';
import { PaginationDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import { districts } from './generation.schema.js';
export class GenerationInputDto {
  @ApiProperty() @Transform(trim) @IsString() @Length(20,1000) goal: string;
  @ApiProperty({ enum: QuestCategory }) @IsEnum(QuestCategory) categoryId: QuestCategory;
  @ApiProperty({ enum: [...districts] }) @IsIn(districts) district: string;
  @ApiProperty() @IsInt() @Min(1) @Max(500) capacity: number;
  @ApiProperty() @IsNumber() @Min(0.5) @Max(12) durationHours: number;
  @ApiPropertyOptional({ type: [String] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsArray() @IsString({ each: true }) interests?: string[];
  @ApiPropertyOptional({ enum: QuestDifficulty }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsEnum(QuestDifficulty) difficulty?: QuestDifficulty;
  @ApiPropertyOptional({ enum: ['individual','team'] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(['individual','team']) participation?: 'individual' | 'team';
  @ApiPropertyOptional({ type: [String] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsArray() @IsString({ each: true }) accessibility?: string[];
}
export class GenerateQuestsDto {
  @ApiProperty({ enum: [1] }) @IsIn([1]) schemaVersion: 1;
  @ApiProperty({ type: GenerationInputDto }) @Type(() => GenerationInputDto) @ValidateNested() input: GenerationInputDto;
  @ApiPropertyOptional() @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsInt() @Min(1) @Max(3) count?: number;
  @ApiPropertyOptional({ format: 'uuid' }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsUUID('4') organizationId?: string;
}
export class ConvertSuggestionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') organizationId: string;
}
export class AiPageQueryDto extends PickType(PaginationDto,['page','pageSize','order']) {}
export class AiDraftValuesDto {
  @ApiProperty() title: string; @ApiProperty() description: string; @ApiProperty() fullDescription: string;
  @ApiProperty() categoryId: string; @ApiProperty() district: string; @ApiProperty() address: string;
  @ApiProperty() date: string; @ApiProperty() time: string; @ApiProperty() locationId: string;
  @ApiProperty() capacity: number; @ApiProperty() durationHours: number; @ApiProperty() difficulty: string;
  @ApiProperty() xp: number; @ApiProperty() rewardPoints: number; @ApiProperty() image: string;
  @ApiProperty() requirements: string; @ApiProperty() bring: string; @ApiProperty() instructions: string;
  @ApiProperty() allowTeamParticipation: boolean; @ApiPropertyOptional() teamParticipantLimit?: number;
}
export class GenerationResponseDto {
  @ApiProperty({ enum: [1] }) schemaVersion: 1;
  @ApiProperty({ enum: ['remote-ai'] }) provider: 'remote-ai';
  @ApiProperty({ type: AiDraftValuesDto }) values: AiDraftValuesDto;
  @ApiProperty({ type: [String] }) warnings: string[];
  @ApiProperty() generationId: string; @ApiProperty() suggestionId: string;
}
export class AiPayloadDto {
  @ApiProperty() title: string; @ApiProperty() shortDescription: string; @ApiProperty() description: string;
  @ApiProperty() category: string; @ApiProperty() suggestedDistrict: string; @ApiProperty() estimatedDuration: number;
  @ApiProperty() difficulty: string; @ApiProperty() requiredVolunteers: number;
  @ApiProperty({ type: [String] }) checklist: string[]; @ApiProperty({ type: [String] }) requirements: string[];
  @ApiProperty() impactIntent: string; @ApiProperty({ type: [String] }) safetyNotes: string[];
  @ApiProperty({ type: [String] }) uncertaintyNotes: string[];
}
export class SuggestionDto {
  @ApiProperty() id: string; @ApiProperty() sessionId: string; @ApiProperty() validationStatus: string;
  @ApiProperty({ type: AiPayloadDto,nullable: true }) payload: AiPayloadDto | null;
  @ApiProperty({ type: String,nullable: true }) savedAt: string | null;
  @ApiProperty({ type: String,nullable: true }) convertedQuestId: string | null;
  @ApiProperty() createdAt: string; @ApiProperty() isFixture: boolean;
}
export class GenerationSessionDto {
  @ApiProperty() id: string; @ApiProperty() status: string; @ApiProperty() provider: string;
  @ApiProperty() model: string; @ApiProperty() isFixture: boolean; @ApiProperty() attempts: number;
  @ApiProperty({ type: String,nullable: true }) errorCode: string | null;
  @ApiProperty() createdAt: string; @ApiProperty({ type: String,nullable: true }) completedAt: string | null;
  @ApiProperty() retentionAt: string; @ApiProperty({ type: [SuggestionDto] }) suggestions: SuggestionDto[];
}
export class GenerationPageDto {
  @ApiProperty({ type: [GenerationSessionDto] }) items: GenerationSessionDto[];
  @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number;
}
export class SuggestionPageDto {
  @ApiProperty({ type: [SuggestionDto] }) items: SuggestionDto[];
  @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number;
}
export class AiCleanupDto { @ApiProperty() completed: boolean; }
