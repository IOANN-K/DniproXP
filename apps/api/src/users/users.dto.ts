import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '../database/entities/domain.js';
export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
export class UpdateUserDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  displayName?: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  bio?: string | null;
  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;
  @ApiPropertyOptional({
    enum: Role,
    description: 'Only a role already assigned to this user',
  })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsEnum(Role)
  primaryRole?: Role;
}
export class PreferencesDto {
  @ApiProperty() publicProfile: boolean;
  @ApiProperty() showDisplayName: boolean;
  @ApiProperty() showActivityHistory: boolean;
  @ApiProperty() showTeams: boolean;
  @ApiProperty() showVerifiedHours: boolean;
  @ApiProperty() showAchievements: boolean;
  @ApiProperty() showSkillProgress: boolean;
  @ApiProperty() showOrganizations: boolean;
}
export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  publicProfile?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showDisplayName?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showActivityHistory?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showTeams?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showVerifiedHours?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showAchievements?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showSkillProgress?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsBoolean()
  showOrganizations?: boolean;
}
export class DerivedStatisticsDto {
  @ApiProperty({
    enum: [false],
    description: 'Verified ledger is a BE-02 dependency; no fabricated totals',
  })
  available: false;
}
export class UserDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty() displayName: string;
  @ApiProperty({ type: String, nullable: true }) bio: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty({ enum: Role, isArray: true }) roles: Role[];
  @ApiProperty({ enum: Role }) primaryRole: Role;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: string | null;
  @ApiProperty({ type: DerivedStatisticsDto }) statistics: DerivedStatisticsDto;
}
export class PublicUserProfileDto {
  @ApiProperty() restricted: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) id?: string;
  @ApiPropertyOptional() displayName?: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl?:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) bio?: string | null;
  @ApiPropertyOptional({ format: 'date-time' }) joinDate?: string;
  @ApiPropertyOptional({ type: DerivedStatisticsDto })
  statistics?: DerivedStatisticsDto;
}
