import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import {
  ModerationStatus,
  StaffRole,
  MembershipStatus,
} from '../database/entities/domain.js';
import { PaginationDto, PageMetaDto } from '../common/pagination.dto.js';
import { trim } from '../users/users.dto.js';
export class CreateOrganizationDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name: string;
  @ApiProperty({
    minLength: 3,
    maxLength: 80,
    pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
  })
  @Transform(trim)
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  slug: string;
  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @Transform(trim)
  @IsString()
  @Length(20, 5000)
  description: string;
  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string | null;
  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string | null;
}
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto, {
  skipNullProperties: false,
}) {}
export class AddMemberDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') userId: string;
  @ApiProperty({ enum: StaffRole }) @IsEnum(StaffRole) role: StaffRole;
}
export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: StaffRole })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(StaffRole)
  role?: StaffRole;
  @ApiPropertyOptional({ enum: MembershipStatus })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
export class ModerationDto {
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @Length(10, 1000)
  reason: string;
}
export class OrganizationDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() description: string;
  @ApiProperty({ type: String, nullable: true }) logoUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) websiteUrl: string | null;
  @ApiProperty({ enum: ModerationStatus }) moderationStatus: ModerationStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}
export class ManagedOrganizationDto extends OrganizationDto {
  @ApiProperty({ type: String, nullable: true }) moderationReason:
    string | null;
}
export class MembershipDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) organizationId: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ enum: StaffRole }) role: StaffRole;
  @ApiProperty({ enum: MembershipStatus }) status: MembershipStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}
export class OrganizationsPageDto {
  @ApiProperty({ type: [OrganizationDto] }) items: OrganizationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
export class ManagedOrganizationsPageDto {
  @ApiProperty({ type: [ManagedOrganizationDto] })
  items: ManagedOrganizationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
export class MembershipsPageDto {
  @ApiProperty({ type: [MembershipDto] }) items: MembershipDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
export { PaginationDto };

export class MembershipQueryDto extends PickType(PaginationDto, [
  'page',
  'pageSize',
  'order',
]) {
  @ApiPropertyOptional({ enum: MembershipStatus })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
