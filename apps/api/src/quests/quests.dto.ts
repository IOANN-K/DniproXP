import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { PaginationDto, PageMetaDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import {
  QuestCategory,
  QuestDifficulty,
  QuestLifecycle,
  QuestModeration,
} from './domain.js';
export class CreateQuestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') organizationId: string;
  @ApiProperty({ minLength: 3, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(3, 100)
  title: string;
  @ApiPropertyOptional({ maxLength: 240 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(240)
  description?: string;
  @ApiPropertyOptional({ maxLength: 5000 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  fullDescription?: string;
  @ApiProperty({ enum: QuestCategory })
  @IsEnum(QuestCategory)
  categoryId: QuestCategory;
  @ApiProperty({ enum: QuestDifficulty })
  @IsEnum(QuestDifficulty)
  difficulty: QuestDifficulty;
  @ApiPropertyOptional({ maxLength: 80 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  district?: string;
  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  address?: string;
  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    description:
      'ISO instant with explicit Z or UTC offset. Draft may omit schedule.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  startAt?: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  endAt?: string | null;
  @ApiProperty({ minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  capacity: number;
  @ApiProperty({ minimum: 10, maximum: 1000 })
  @IsInt()
  @Min(10)
  @Max(1000)
  xp: number;
  @ApiProperty({ minimum: 0, maximum: 500 })
  @IsInt()
  @Min(0)
  @Max(500)
  rewardPoints: number;
  @ApiPropertyOptional({ type: [String], maxItems: 1000 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  requirements?: string[];
  @ApiPropertyOptional({ type: [String], maxItems: 1000 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  bring?: string[];
  @ApiPropertyOptional({ maxLength: 3000 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(3000)
  instructions?: string;
  @ApiPropertyOptional({
    nullable: true,
    enum: [
      '/images/community.jpg',
      '/images/nature.jpg',
      '/images/dogs.jpg',
      '/images/books.jpg',
    ],
  })
  @IsOptional()
  @IsIn([
    '/images/community.jpg',
    '/images/nature.jpg',
    '/images/dogs.jpg',
    '/images/books.jpg',
  ])
  image?: string | null;
  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  imageAlt?: string;
  @ApiPropertyOptional({
    nullable: true,
    enum: ['', 'quest-4', 'quest-7', 'quest-20'],
    description: 'Server-reviewed public areas; no arbitrary coordinate input',
  })
  @IsOptional()
  @IsIn(['', 'quest-4', 'quest-7', 'quest-20'])
  locationId?: string | null;
  @ApiPropertyOptional({ default: false })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  allowTeamParticipation?: boolean;
  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  teamParticipantLimit?: number | null;
}
export class UpdateQuestDto extends PartialType(
  OmitType(CreateQuestDto, ['organizationId']),
  { skipNullProperties: false },
) {}
export class ReasonDto {
  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @Length(5, 1000)
  reason: string;
}
export class QuestQueryDto extends PickType(PaginationDto, [
  'page',
  'pageSize',
  'order',
  'search',
]) {
  @ApiPropertyOptional({
    enum: ['date', 'createdAt', 'xp', 'title'],
    default: 'date',
  })
  @IsIn(['date', 'createdAt', 'xp', 'title'])
  sort: 'date' | 'createdAt' | 'xp' | 'title' = 'date';
  @ApiPropertyOptional({ enum: QuestCategory })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(QuestCategory)
  category?: QuestCategory;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(80)
  district?: string;
  @ApiPropertyOptional({ enum: QuestDifficulty })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(QuestDifficulty)
  difficulty?: QuestDifficulty;
  @ApiPropertyOptional({ enum: QuestLifecycle })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(QuestLifecycle)
  lifecycle?: QuestLifecycle;
  @ApiPropertyOptional({ enum: ['available', 'completed'] })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsIn(['available', 'completed'])
  status?: 'available' | 'completed';
  @ApiPropertyOptional({ format: 'date-time' })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsISO8601({ strict: true })
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsISO8601({ strict: true })
  to?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsUUID('4')
  organization?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  availability?: boolean;
  @ApiPropertyOptional({ minimum: 0 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  minXp?: number;
}
export class QuestDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) organizationId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: QuestCategory }) categoryId: QuestCategory;
  @ApiProperty({ enum: QuestDifficulty }) difficulty: QuestDifficulty;
  @ApiProperty() district: string;
  @ApiProperty() address: string;
  @ApiProperty({ type: [Number], nullable: true, minItems: 2, maxItems: 2 })
  coordinates: [number, number] | null;
  @ApiProperty({ type: String, nullable: true }) coordinateSource:
    string | null;
  @ApiProperty({ type: String, nullable: true }) locationLabel: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) startAt:
    string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) endAt:
    string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date-time',
    description: 'Frontend compatibility alias of startAt',
  })
  date: string | null;
  @ApiProperty({ type: Number, nullable: true }) durationMinutes: number | null;
  @ApiProperty() capacity: number;
  @ApiProperty({
    description:
      'Pending reservations + approved non-cancelled participations; includes completed seats',
  })
  participants: number;
  @ApiProperty() availability: boolean;
  @ApiProperty() xp: number;
  @ApiProperty() rewardPoints: number;
  @ApiProperty({ type: [String] }) requirements: string[];
  @ApiProperty({ type: [String] }) bring: string[];
  @ApiProperty() instructions: string;
  @ApiProperty({ type: String, nullable: true }) image: string | null;
  @ApiProperty() imageAlt: string;
  @ApiProperty({ enum: QuestLifecycle }) lifecycle: QuestLifecycle;
  @ApiProperty({
    enum: [QuestLifecycle.COMPLETED, QuestLifecycle.CANCELLED],
    nullable: true,
    description: 'Closure state preserved when archived',
  })
  archivedFrom: QuestLifecycle | null;
  @ApiProperty({ enum: QuestModeration }) moderation: QuestModeration;
  @ApiProperty({ enum: ['available', 'completed'] }) status:
    'available' | 'completed';
  @ApiProperty() allowTeamParticipation: boolean;
  @ApiProperty({ type: Number, nullable: true }) teamParticipantLimit:
    number | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}
export class ManagedQuestDto extends QuestDto {
  @ApiProperty({ type: String, nullable: true }) moderationReason:
    string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  reviewSubmittedAt: string | null;
}
export class QuestPageDto {
  @ApiProperty({ type: [QuestDto] }) items: QuestDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
export class ManagedQuestPageDto {
  @ApiProperty({ type: [ManagedQuestDto] }) items: ManagedQuestDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
