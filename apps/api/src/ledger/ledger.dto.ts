import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { PaginationDto, PageMetaDto } from '../common/pagination.dto.js';
import { Currency, LedgerType } from '../quests/domain.js';
export class LedgerQueryDto extends PickType(PaginationDto, [
  'page',
  'pageSize',
  'order',
]) {
  @ApiPropertyOptional({ enum: Currency })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(Currency)
  currency?: Currency;
}
export class BalanceDto {
  @ApiProperty() totalXP: number;
  @ApiProperty() rewardPointsBalance: number;
}
export class ProgressionDto extends BalanceDto {
  @ApiProperty() currentLevel: number;
  @ApiProperty() levelName: string;
  @ApiProperty({ type: Number, nullable: true }) nextLevelXP: number | null;
  @ApiProperty({ type: Number, nullable: true }) xpToNextLevel: number | null;
  @ApiProperty() progress: number;
  @ApiProperty() verifiedQuestsCount: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Known confirmed minutes; null if activities exist but none has measured time',
  })
  verifiedMinutes: number | null;
  @ApiProperty({
    description:
      'Count of confirmed activities with unknown time; totals are partial when >0',
  })
  unknownMinutesCount: number;
}
export class LedgerEntryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: Currency }) currency: Currency;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: LedgerType }) transactionType: LedgerType;
  @ApiProperty() sourceType: string;
  @ApiProperty({ format: 'uuid' }) sourceId: string;
  @ApiProperty() idempotencyKey: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'null' },
      ],
    },
  })
  metadata: Record<string, string | number | boolean | null>;
}
export class LedgerPageDto {
  @ApiProperty({ type: [LedgerEntryDto] }) items: LedgerEntryDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
