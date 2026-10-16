import { ApiProperty,ApiPropertyOptional,PickType } from '@nestjs/swagger';
import { IsIn,IsISO8601,IsNumber,IsOptional,IsString,IsUUID,Length,Matches,Max,MaxLength,Min,ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
import { physicalMetrics } from '../progress/domain.js';
import type { PhysicalMetric } from '../progress/domain.js';
export class ImpactFilterDto {
 @ApiPropertyOptional({pattern:'^\\d{4}-\\d{2}-\\d{2}$',description:'Inclusive Europe/Kyiv calendar day'}) @ValidateIf((_o:unknown,v:unknown)=>v!==undefined) @IsISO8601({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}$/) from?:string;
 @ApiPropertyOptional({description:'Inclusive Europe/Kyiv calendar day'}) @ValidateIf((_o:unknown,v:unknown)=>v!==undefined) @IsISO8601({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}$/) to?:string;
 @ApiPropertyOptional() @ValidateIf((_o:unknown,v:unknown)=>v!==undefined) @IsString() @MaxLength(80) district?:string;
 @ApiPropertyOptional({enum:['eco','social','animals','culture','education','city']}) @ValidateIf((_o:unknown,v:unknown)=>v!==undefined) @IsIn(['eco','social','animals','culture','education','city']) category?:string;
 @ApiPropertyOptional({format:'uuid'}) @ValidateIf((_o:unknown,v:unknown)=>v!==undefined) @IsUUID('4') organization?:string;
}
export class ReceiptQueryDto extends PickType(PaginationDto,['page','pageSize','order']) {}
export class MeasurementDto {
 @ApiProperty({enum:physicalMetrics}) @IsIn(physicalMetrics) metric:PhysicalMetric;
 @ApiProperty({minimum:0,maximum:1000000}) @IsNumber({allowNaN:false,allowInfinity:false,maxDecimalPlaces:6}) @Min(0) @Max(1000000) value:number;
 @ApiProperty({enum:['kg','count','m2','units']}) @IsIn(['kg','count','m2','units']) unit:string;
 @ApiProperty({minLength:10,maxLength:2000}) @Transform(trim) @IsString() @Length(10,2000) summary:string;
 @ApiProperty({format:'uuid',description:'Client operation UUID; stable across retries'}) @IsUUID('4') operationId:string;
 @ApiPropertyOptional({nullable:true,format:'uuid',description:'Expected current measurement ID for correction'}) @IsOptional() @IsUUID('4') supersedesId?:string|null;
}
export class MetricValueDto { @ApiPropertyOptional() provenance?:string; @ApiProperty() type:string; @ApiProperty({type:Number,nullable:true}) value:number|null; @ApiProperty() unit:string; }
export class ImpactSummaryDto {
 @ApiProperty({type:Number,nullable:true}) verifiedHours:number|null;
 @ApiProperty() unknownMinutesCount:number;
 @ApiProperty() verifiedContributions:number;
 @ApiProperty() uniqueVolunteers:number;
 @ApiProperty() completedActivities:number;
 @ApiProperty() contributingOrganizations:number;
 @ApiProperty({type:[MetricValueDto]}) metrics:MetricValueDto[];
 @ApiProperty({enum:['organizer-confirmation']}) provenance:string;
}
export class ImpactGroupDto extends ImpactSummaryDto { @ApiProperty() key:string; }
export class ImpactTrendDto { @ApiProperty() day:string; @ApiProperty() contributions:number; @ApiProperty({type:Number,nullable:true}) verifiedHours:number|null; }
export class ImpactOverviewDto extends ImpactSummaryDto { @ApiProperty({type:[ImpactTrendDto]}) trends:ImpactTrendDto[]; }
export class ReceiptDto {
 @ApiProperty({format:'uuid'}) id:string; @ApiProperty({format:'uuid'}) userId:string;
 @ApiProperty({format:'uuid'}) verifiedActivityId:string; @ApiProperty({format:'uuid'}) questId:string;
 @ApiProperty({format:'uuid'}) organizationId:string; @ApiProperty({format:'date-time'}) verifiedAt:string;
 @ApiProperty({type:Number,nullable:true}) verifiedMinutes:number|null;
 @ApiProperty({type:[MetricValueDto]}) metrics:MetricValueDto[];
 @ApiProperty({format:'uuid'}) publicReference:string; @ApiProperty({format:'date-time'}) issuedAt:string;
}
export class ReceiptPageDto { @ApiProperty({type:[ReceiptDto]}) items:ReceiptDto[]; @ApiProperty() total:number; @ApiProperty() page:number; @ApiProperty() pageSize:number; }
export class PublicReceiptDto {
 @ApiProperty({type:Boolean,example:true}) valid:true; @ApiProperty() publicReference:string;
 @ApiProperty({format:'date-time'}) verifiedAt:string; @ApiProperty({format:'date-time'}) issuedAt:string;
 @ApiProperty() questTitle:string;
 @ApiPropertyOptional({type:Number,nullable:true}) verifiedMinutes?:number|null;
 @ApiPropertyOptional() organizationName?:string;
}
export class CollectiveMeasurementDto {
 @ApiProperty({format:'uuid'}) id:string; @ApiProperty({format:'uuid'}) questId:string;
 @ApiProperty() metric:string; @ApiProperty() value:number; @ApiProperty() unit:string;
 @ApiProperty({type:String,nullable:true}) supersedesId:string|null; @ApiProperty() summary:string;
 @ApiProperty({format:'date-time'}) measuredAt:string;
 @ApiProperty({format:'uuid'}) sourceVerifiedActivityId:string;
 @ApiProperty({format:'uuid'}) verifiedByUserId:string;
}
