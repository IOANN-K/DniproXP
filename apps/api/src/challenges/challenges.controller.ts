import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/authorization.js';
import { Role } from '../database/entities/domain.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { DefinitionService, challengeView } from '../progress/definition.service.js';
import { ProgressService } from '../progress/progress.service.js';
import { RewardClaimsService } from '../progress/reward-claims.service.js';
import { ChallengeDefinition } from '../progress/definition.entity.js';
import { ChallengeProgressEngine } from './challenge-progress.engine.js';
import { ProgressQueryDto, ChallengeInputDto, ChallengeDefinitionDto, ChallengePageDto, ChallengeProgressDto, UserChallengePageDto, RewardClaimDto, LeaderboardQueryDto, LeaderboardDto, ChallengeJoinDto } from '../progress/progress.dto.js';

@ApiTags('City Challenges')
@ApiErrors()
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly engine: ChallengeProgressEngine, private readonly progress: ProgressService, private readonly claims: RewardClaimsService) {}
  @Get()
  @ApiOkResponse({ type: ChallengePageDto })
  list(@Query() query: ProgressQueryDto): Promise<ChallengePageDto> { return this.progress.publicChallenges(query); }
  @Get(':id')
  @ApiOkResponse({ type: ChallengeDefinitionDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ChallengeDefinitionDto> { return this.progress.publicChallenge(id); }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Спільний підтверджений прогрес; особисті години окремо від одноразових вимірів квестів' })
  @ApiOkResponse({ type: ChallengeProgressDto })
  progressOf(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ChallengeProgressDto> { return this.engine.progress(id); }
  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Відкриті профілі з дозволом на історію та години; години ↓, квести ↓, UUID ↑' })
  @ApiOkResponse({ type: LeaderboardDto })
  leaderboard(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: LeaderboardQueryDto): Promise<LeaderboardDto> { return this.engine.leaderboard(id, query); }

  @Post(':id/participants')
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(Role.VOLUNTEER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ type: ChallengeJoinDto })
  join(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ChallengeJoinDto> { return this.progress.join(actor.user.id, id); }
  @Post(':id/claim')
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(Role.VOLUNTEER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Одноразовий бонус після спільної цілі та власного verified-внеску; enrollment не обов’язковий' })
  @ApiOkResponse({ type: RewardClaimDto })
  claim(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<RewardClaimDto> { return this.claims.claim(actor.user.id, 'challenge', id); }
}

@ApiTags('My Challenges')
@ApiErrors()
@ApiBearerAuth()
@Roles(Role.VOLUNTEER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/me/challenges')
export class MyChallengesController {
  constructor(private readonly service: ProgressService) {}
  @Get()
  @ApiOkResponse({ type: UserChallengePageDto })
  list(@CurrentUser() actor: Principal, @Query() query: ProgressQueryDto): Promise<UserChallengePageDto> { return this.service.ownChallenges(actor.user.id, query); }
}

@ApiTags('Challenge definitions administration')
@ApiErrors()
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/challenges')
export class AdminChallengesController {
  constructor(private readonly definitions: DefinitionService, private readonly source: DataSource) {}
  @Get()
  @ApiOkResponse({ type: ChallengePageDto })
  list(@Query() query: ProgressQueryDto): Promise<ChallengePageDto> { return this.definitions.listChallenges(query, true); }
  @Get(':id')
  @ApiOkResponse({ type: ChallengeDefinitionDto })
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ChallengeDefinitionDto> { return challengeView(await this.definitions.challenge(this.source.manager, id, true)); }
  @Post()
  @ApiCreatedResponse({ type: ChallengeDefinitionDto })
  async create(@CurrentUser() actor: Principal, @Body() input: ChallengeInputDto): Promise<ChallengeDefinitionDto> { return challengeView(await this.definitions.saveChallenge(actor.user.id, input)); }
  @Put(':id')
  @ApiOperation({ summary: 'Повністю замінити чернетку; опубліковані цілі, scope та нагороди незмінні' })
  @ApiOkResponse({ type: ChallengeDefinitionDto })
  async update(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() input: ChallengeInputDto): Promise<ChallengeDefinitionDto> { return challengeView(await this.definitions.saveChallenge(actor.user.id, input, id)); }

  private async transition(actor: Principal, id: string, action: 'publish' | 'cancel'): Promise<ChallengeDefinitionDto> {
    const definition = await this.definitions.transition(actor.user.id, 'challenge', id, action);
    if (!(definition instanceof ChallengeDefinition)) throw new Error('Unexpected definition kind');
    return challengeView(definition);
  }
  @Post(':id/publish')
  @HttpCode(200)
  @ApiOkResponse({ type: ChallengeDefinitionDto })
  publish(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ChallengeDefinitionDto> { return this.transition(actor, id, 'publish'); }
  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ type: ChallengeDefinitionDto })
  cancel(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ChallengeDefinitionDto> { return this.transition(actor, id, 'cancel'); }
}
