import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/authorization.js';
import { Role } from '../database/entities/domain.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { DefinitionService, missionView } from '../progress/definition.service.js';
import { ProgressService } from '../progress/progress.service.js';
import { RewardClaimsService } from '../progress/reward-claims.service.js';
import { MissionProgressEngine } from './mission-progress.engine.js';
import { MissionDefinition } from '../progress/definition.entity.js';
import { ProgressQueryDto, MissionInputDto, MissionDefinitionDto, MissionPageDto, MissionProgressDto, UserMissionPageDto, RewardClaimDto } from '../progress/progress.dto.js';

@ApiTags('Missions')
@ApiErrors()
@Controller('missions')
export class MissionsController {
  constructor(private readonly definitions: DefinitionService, private readonly source: DataSource, private readonly claims: RewardClaimsService, private readonly progress: ProgressService) {}
  @Get()
  @ApiOkResponse({ type: MissionPageDto })
  list(@Query() query: ProgressQueryDto): Promise<MissionPageDto> { return this.definitions.listMissions(query); }

  @Get(':id')
  @ApiOkResponse({ type: MissionDefinitionDto })
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionDefinitionDto> { return missionView(await this.definitions.mission(this.source.manager, id)); }

  @Post(':id/enrollments')
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(Role.VOLUNTEER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Почати доступну історію; заявка на квест не підтверджує виконання етапу' })
  @ApiOkResponse({ type: MissionProgressDto })
  enroll(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionProgressDto> { return this.progress.enroll(actor.user.id, id); }

  @Post(':id/claim')
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(Role.VOLUNTEER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Отримати бонус завершеної місії; лише verified events; повтор повертає ту саму виплату' })
  @ApiOkResponse({ type: RewardClaimDto })
  claim(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<RewardClaimDto> { return this.claims.claim(actor.user.id, 'mission', id); }
}

@ApiTags('My Missions')
@ApiErrors()
@ApiBearerAuth()
@Roles(Role.VOLUNTEER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/me/missions')
export class MyMissionsController {
  constructor(private readonly progress: ProgressService, private readonly engine: MissionProgressEngine) {}
  @Get()
  @ApiOkResponse({ type: UserMissionPageDto })
  list(@CurrentUser() actor: Principal, @Query() query: ProgressQueryDto): Promise<UserMissionPageDto> { return this.progress.ownMissions(actor.user.id, query); }
  @Get(':id')
  @ApiOkResponse({ type: MissionProgressDto })
  get(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionProgressDto> { return this.engine.progress(actor.user.id, id); }
}

@ApiTags('Mission definitions administration')
@ApiErrors()
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/missions')
export class AdminMissionsController {
  constructor(private readonly definitions: DefinitionService, private readonly source: DataSource) {}
  @Get()
  @ApiOkResponse({ type: MissionPageDto })
  list(@Query() query: ProgressQueryDto): Promise<MissionPageDto> { return this.definitions.listMissions(query, true); }
  @Get(':id')
  @ApiOkResponse({ type: MissionDefinitionDto })
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionDefinitionDto> { return missionView(await this.definitions.mission(this.source.manager, id, true)); }
  @Post()
  @ApiCreatedResponse({ type: MissionDefinitionDto })
  async create(@CurrentUser() actor: Principal, @Body() input: MissionInputDto): Promise<MissionDefinitionDto> { return missionView(await this.definitions.saveMission(actor.user.id, input)); }
  @Put(':id')
  @ApiOperation({ summary: 'Повністю замінити чернетку; опубліковані правила заморожені' })
  @ApiOkResponse({ type: MissionDefinitionDto })
  async update(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() input: MissionInputDto): Promise<MissionDefinitionDto> { return missionView(await this.definitions.saveMission(actor.user.id, input, id)); }

  private async transition(actor: Principal, id: string, action: 'publish' | 'archive' | 'complete'): Promise<MissionDefinitionDto> {
    const definition = await this.definitions.transition(actor.user.id, 'mission', id, action);
    if (!(definition instanceof MissionDefinition)) throw new Error('Unexpected definition kind');
    return missionView(definition);
  }
  @Post(':id/publish')
  @HttpCode(200)
  @ApiOkResponse({ type: MissionDefinitionDto })
  publish(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionDefinitionDto> { return this.transition(actor, id, 'publish'); }
  @Post(':id/archive')
  @HttpCode(200)
  @ApiOkResponse({ type: MissionDefinitionDto })
  archive(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionDefinitionDto> { return this.transition(actor, id, 'archive'); }
  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Закрити приймання нових етапів; не видає персональних completions чи нагород' })
  @ApiOkResponse({ type: MissionDefinitionDto })
  complete(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MissionDefinitionDto> { return this.transition(actor, id, 'complete'); }
}
