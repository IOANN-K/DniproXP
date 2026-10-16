import { ApiProperty,ApiPropertyOptional,PartialType,PickType } from '@nestjs/swagger';
import { Transform,Type } from 'class-transformer';
import { IsBoolean,IsIn,IsInt,IsString,IsUUID,Length,Max,Min,ValidateIf } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import { rewardCategories } from './reward.entity.js';
import type { RewardCategory } from './reward.entity.js';
export class RewardFormDto {
  @ApiPropertyOptional({ format: 'uuid',description: 'Omit for ADMIN-managed platform catalog' }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsUUID('4') organizationId?: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(3,100) title: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(20,1500) description: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(20,3000) details: string;
  @ApiPropertyOptional({ enum: ['/images/community.jpg','/images/nature.jpg','/images/books.jpg','/images/dogs.jpg'] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(['/images/community.jpg','/images/nature.jpg','/images/books.jpg','/images/dogs.jpg']) image?: string;
  @ApiProperty({ enum: [...rewardCategories] }) @IsIn(rewardCategories) category: RewardCategory;
  @ApiProperty() @IsInt() @Min(1) @Max(1000000) pricePoints: number;
  @ApiProperty({ description: 'Total supply, including reserved/fulfilled units' }) @IsInt() @Min(0) @Max(1000000) stock: number;
  @ApiProperty({ enum: ['ACTIVE','UNAVAILABLE'] }) @IsIn(['ACTIVE','UNAVAILABLE']) status: 'ACTIVE' | 'UNAVAILABLE';
  @ApiProperty({ enum: ['PUBLIC','PRIVATE'] }) @IsIn(['PUBLIC','PRIVATE']) visibility: 'PUBLIC' | 'PRIVATE';
  @ApiProperty() @Transform(trim) @IsString() @Length(20,2000) redemptionRules: string;
  @ApiProperty() @IsBoolean() isDemo: boolean;
}
export class UpdateRewardDto extends PartialType(PickType(RewardFormDto,['title','description','details','image','category','pricePoints','stock','status','visibility','redemptionRules','isDemo']),{ skipNullProperties: false }) {}
export class RewardQueryDto extends PickType(PaginationDto,['page','pageSize','order','search']) {
  @ApiPropertyOptional({ enum: [...rewardCategories] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(rewardCategories) category?: RewardCategory;
  @ApiPropertyOptional() @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) maxCost?: number;
  @ApiPropertyOptional({ enum: ['true','false'] }) @ValidateIf((_o: unknown,v: unknown) => v !== undefined) @IsIn(['true','false']) available?: 'true' | 'false';
}
export class RewardHistoryQueryDto extends PickType(PaginationDto,['page','pageSize','order']) {}
export class RedeemRewardDto { @ApiProperty({ format: 'uuid' }) @IsUUID('4') rewardId: string; }
export class RewardDto {
  @ApiProperty() id: string; @ApiProperty({ type: String,nullable: true }) organizationId: string | null;
  @ApiProperty() title: string; @ApiProperty() name: string; @ApiProperty() description: string; @ApiProperty() details: string;
  @ApiProperty({ type: String,nullable: true }) image: string | null; @ApiProperty() category: string;
  @ApiProperty() pricePoints: number; @ApiProperty() cost: number; @ApiProperty() stock: number; @ApiProperty() stockTotal: number;
  @ApiProperty() availability: boolean; @ApiProperty() status: string; @ApiProperty() visibility: string;
  @ApiProperty() redemptionRules: string; @ApiProperty() isDemo: boolean; @ApiProperty() createdAt: string; @ApiProperty() updatedAt: string;
}
export class RewardPageDto { @ApiProperty({ type: [RewardDto] }) items: RewardDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class RedemptionDto {
  @ApiProperty() id: string; @ApiProperty() rewardId: string; @ApiProperty() rewardTitle: string; @ApiProperty() pricePoints: number;
  @ApiProperty() status: string; @ApiProperty() isDemo: boolean; @ApiProperty() createdAt: string;
  @ApiProperty({ type: String,nullable: true }) reservedAt: string | null; @ApiProperty({ type: String,nullable: true }) fulfilledAt: string | null;
  @ApiProperty({ type: String,nullable: true }) cancelledAt: string | null; @ApiProperty({ type: String,nullable: true }) cancellationReason: string | null;
}
export class RedemptionResultDto { @ApiProperty({ type: RedemptionDto }) redemption: RedemptionDto; @ApiProperty() rewardPointsBalance: number; }
export class RedemptionPageDto { @ApiProperty({ type: [RedemptionDto] }) items: RedemptionDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
export class FulfillmentItemDto {
  @ApiProperty() id: string; @ApiProperty() userId: string; @ApiProperty() rewardId: string;
  @ApiProperty() rewardTitle: string; @ApiProperty() status: string; @ApiProperty() isDemo: boolean;
  @ApiProperty({ type: String,nullable: true }) reservedAt: string | null;
}
export class FulfillmentPageDto { @ApiProperty({ type: [FulfillmentItemDto] }) items: FulfillmentItemDto[]; @ApiProperty() total: number; @ApiProperty() page: number; @ApiProperty() pageSize: number; }
