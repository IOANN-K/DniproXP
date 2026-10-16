import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/authorization.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { privateUser } from './projections.js';
import {
  PreferencesDto,
  PublicUserProfileDto,
  UpdatePreferencesDto,
  UpdateUserDto,
  UserDto,
} from './users.dto.js';
import { UsersService } from './users.service.js';
@ApiTags('Users')
@ApiErrors()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() principal: Principal): UserDto {
    return privateUser(principal.user);
  }
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  update(
    @CurrentUser() principal: Principal,
    @Body() input: UpdateUserDto,
  ): Promise<UserDto> {
    return this.users.update(principal.user.id, input);
  }
  @Get('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PreferencesDto })
  preferences(@CurrentUser() principal: Principal): Promise<PreferencesDto> {
    return this.users.getPreferences(principal.user.id);
  }
  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PreferencesDto })
  updatePreferences(
    @CurrentUser() principal: Principal,
    @Body() input: UpdatePreferencesDto,
  ): Promise<PreferencesDto> {
    return this.users.updatePreferences(principal.user.id, input);
  }
  @Get(':id/public-profile')
  @ApiOkResponse({ type: PublicUserProfileDto })
  publicProfile(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicUserProfileDto> {
    return this.users.publicProfile(id);
  }
}
