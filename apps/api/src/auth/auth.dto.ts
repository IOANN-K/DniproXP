import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserDto, trim } from '../users/users.dto.js';
export class LoginDto {
  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @Length(12, 128)
  password: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  displayName: string;
}
export class AuthResponseDto {
  @ApiProperty({
    description:
      'Short-lived access token. Keep in memory, never localStorage.',
  })
  accessToken: string;
  @ApiProperty({ enum: ['Bearer'] }) tokenType: 'Bearer';
  @ApiProperty({ description: 'Seconds until access expiry' })
  expiresIn: number;
  @ApiProperty({ type: UserDto }) user: UserDto;
}
