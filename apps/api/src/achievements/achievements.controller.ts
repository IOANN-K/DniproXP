import { Controller,Get,Param,ParseUUIDPipe,Query,Req,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiOkResponse,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard } from '../auth/authorization.js';
import { OptionalJwtGuard } from '../quests/optional-jwt.guard.js';
import { ApiErrors } from '../common/http.js';
import type { Principal,ApiRequest } from '../common/http.js';
import { IdentityPageQueryDto } from '../skills/skills.dto.js';
import { AchievementDefinitionPageDto,AchievementUnlockPageDto,PublicAchievementPageDto,TeamAchievementDto } from './achievements.dto.js';
import { AchievementsService } from './achievements.service.js';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Achievements') @ApiErrors() @Controller('achievements')
export class AchievementsController {
  constructor(private readonly service: AchievementsService) {}
  @Get() @ApiOkResponse({ type: AchievementDefinitionPageDto })
  list(@Query() q: IdentityPageQueryDto) { return this.service.definitions(q); }
}
@ApiTags('My Achievements') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('users/me/achievements')
export class MyAchievementsController {
  constructor(private readonly service: AchievementsService) {}
  @Get() @ApiOkResponse({ type: AchievementUnlockPageDto })
  list(@CurrentUser() a: Principal,@Query() q: IdentityPageQueryDto) { return this.service.own(a.user.id,q); }
}
@ApiTags('Public Achievements') @ApiErrors() @Controller('users')
export class PublicAchievementsController {
  constructor(private readonly service: AchievementsService) {}
  @Get(':id/achievements') @ApiOkResponse({ type: PublicAchievementPageDto })
  list(@Param('id',uuid) id: string,@Query() q: IdentityPageQueryDto) { return this.service.public(id,q); }
}
@ApiTags('Team Achievements') @ApiErrors() @UseGuards(OptionalJwtGuard) @Controller('teams')
export class TeamAchievementsController {
  constructor(private readonly service: AchievementsService) {}
  @Get(':id/achievements') @ApiOkResponse({ type: TeamAchievementDto,isArray: true })
  list(@Param('id',uuid) id: string,@Req() req: ApiRequest) { return this.service.team(id,req.principal?.user.id); }
}
