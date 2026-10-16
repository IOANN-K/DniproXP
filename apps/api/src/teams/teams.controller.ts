import { Body,Controller,Get,HttpCode,Param,ParseUUIDPipe,Patch,Post,Query,Req,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiCreatedResponse,ApiOkResponse,ApiOperation,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard,Roles,RolesGuard } from '../auth/authorization.js';
import { OptionalJwtGuard } from '../quests/optional-jwt.guard.js';
import { Role } from '../database/entities/domain.js';
import { ApiErrors } from '../common/http.js';
import type { ApiRequest,Principal } from '../common/http.js';
import { ReasonDto } from '../quests/quests.dto.js';
import { TeamQueries } from './team.queries.js';
import { TeamsService } from './teams.service.js';
import { TeamQueryDto,TeamHistoryQueryDto,TeamMemberQueryDto,TeamPeriodQueryDto,TeamPeriodPageQueryDto,TeamLeaderboardQueryDto,TeamRankingQueryDto,TeamFormDto,UpdateTeamDto,TargetUserDto,MemberRoleDto,TeamDto,TeamPageDto,MemberPageDto,JoinRequestDto,JoinRequestPageDto,InvitationDto,InvitationPageDto,TeamStatisticsDto,TeamContributionPageDto,TeamLeaderboardDto,TeamRankingDto,TeamCommandResultDto } from './team.dto.js';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Teams') @ApiErrors() @UseGuards(OptionalJwtGuard) @Controller('teams')
export class TeamsController {
  constructor(private readonly queries: TeamQueries) {}
  @Get() @ApiOkResponse({ type: TeamPageDto })
  list(@Query() q: TeamQueryDto,@Req() req: ApiRequest) { return this.queries.list(q,req.principal?.user.id); }
  @Get('leaderboard') @ApiOkResponse({ type: TeamRankingDto }) @ApiOperation({ summary: 'Публічні команди: години, підтверджені участі, стабільний UUID; Europe/Kyiv month' })
  ranking(@Query() q: TeamRankingQueryDto) { return this.queries.ranking(q); }
  @Get(':id') @ApiOkResponse({ type: TeamDto })
  get(@Param('id',uuid) id: string,@Req() req: ApiRequest) { return this.queries.get(id,req.principal?.user.id); }
  @Get(':id/members') @ApiOkResponse({ type: MemberPageDto })
  members(@Param('id',uuid) id: string,@Query() q: TeamMemberQueryDto,@Req() req: ApiRequest) { return this.queries.members(id,q,req.principal?.user.id); }
  @Get(':id/statistics') @ApiOkResponse({ type: TeamStatisticsDto })
  statistics(@Param('id',uuid) id: string,@Query() q: TeamPeriodQueryDto,@Req() req: ApiRequest) { return this.queries.statistics(id,q,req.principal?.user.id); }
  @Get(':id/contributions') @ApiOkResponse({ type: TeamContributionPageDto }) @ApiOperation({ summary: 'Видимі профілі та власний внесок; без приватних звітів' })
  contributions(@Param('id',uuid) id: string,@Query() q: TeamPeriodPageQueryDto,@Req() req: ApiRequest) { return this.queries.contributions(q,req.principal?.user.id,id); }
  @Get(':id/leaderboard') @ApiOkResponse({ type: TeamLeaderboardDto })
  leaderboard(@Param('id',uuid) id: string,@Query() q: TeamLeaderboardQueryDto,@Req() req: ApiRequest) { return this.queries.leaderboard(id,q,req.principal?.user.id); }
}
@ApiTags('Team management') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Role.VOLUNTEER) @Controller('teams')
export class TeamCommandsController {
  constructor(private readonly service: TeamsService,private readonly queries: TeamQueries) {}
  @Post() @ApiCreatedResponse({ type: TeamDto })
  async create(@CurrentUser() a: Principal,@Body() body: TeamFormDto) { const t = await this.service.create(a.user.id,body);return this.queries.get(t.id,a.user.id); }
  @Patch(':id') @ApiOkResponse({ type: TeamDto }) @ApiOperation({ summary: 'OWNER/MANAGER: змінити профіль і політику вступу, не зменшуючи ліміт нижче складу' })
  async update(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: UpdateTeamDto) { await this.service.update(a.user.id,id,body);return this.queries.get(id,a.user.id); }
  @Post(':id/join-requests') @HttpCode(200) @ApiOkResponse({ type: JoinRequestDto }) @ApiOperation({ summary: 'OPEN: сервер одразу приймає; APPROVAL: очікує OWNER/MANAGER; PRIVATE: лише запрошення' })
  join(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.join(a.user.id,id); }
  @Get(':id/join-requests') @ApiOkResponse({ type: JoinRequestPageDto })
  requests(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Query() q: TeamHistoryQueryDto) { return this.queries.requests(a.user.id,q,id); }
  @Post(':id/join-requests/:requestId/approve') @HttpCode(200) @ApiOkResponse({ type: JoinRequestDto })
  approve(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Param('requestId',uuid) requestId: string) { return this.service.requestAction(a.user.id,id,requestId,'approve',null); }
  @Post(':id/join-requests/:requestId/reject') @HttpCode(200) @ApiOkResponse({ type: JoinRequestDto })
  reject(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Param('requestId',uuid) requestId: string,@Body() body: ReasonDto) { return this.service.requestAction(a.user.id,id,requestId,'reject',body.reason); }
  @Post(':id/join-requests/:requestId/cancel') @HttpCode(200) @ApiOkResponse({ type: JoinRequestDto })
  cancel(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Param('requestId',uuid) requestId: string) { return this.service.requestAction(a.user.id,id,requestId,'cancel',null); }
  @Post(':id/invitations') @ApiCreatedResponse({ type: InvitationDto })
  invite(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: TargetUserDto) { return this.service.invite(a.user.id,id,body.userId); }
  @Post(':id/leave') @HttpCode(200) @ApiOkResponse({ type: TeamCommandResultDto })
  async leave(@CurrentUser() a: Principal,@Param('id',uuid) id: string): Promise<TeamCommandResultDto> { await this.service.memberAction(a.user.id,id,a.user.id,'leave');return { teamId: id,success: true }; }
  @Post(':id/members/:userId/remove') @HttpCode(200) @ApiOkResponse({ type: TeamCommandResultDto })
  async remove(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Param('userId',uuid) userId: string): Promise<TeamCommandResultDto> { await this.service.memberAction(a.user.id,id,userId,'remove');return { teamId: id,success: true }; }
  @Post(':id/member-roles') @HttpCode(200) @ApiOkResponse({ type: TeamDto })
  async role(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: MemberRoleDto) { await this.service.memberAction(a.user.id,id,body.userId,'role',body);return this.queries.get(id,a.user.id); }
  @Post(':id/transfer-captain') @HttpCode(200) @ApiOkResponse({ type: TeamDto })
  async transfer(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: TargetUserDto) { await this.service.memberAction(a.user.id,id,body.userId,'transfer');return this.queries.get(id,a.user.id); }
  @Post(':id/archive') @HttpCode(200) @ApiOkResponse({ type: TeamDto })
  async archive(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { await this.service.archive(a.user.id,id);return this.queries.get(id,a.user.id); }
}
@ApiTags('My Teams') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('users/me')
export class MyTeamsController {
  constructor(private readonly queries: TeamQueries) {}
  @Get('teams') @ApiOkResponse({ type: TeamPageDto })
  teams(@CurrentUser() a: Principal,@Query() q: TeamQueryDto) { return this.queries.list(q,a.user.id,true); }
  @Get('team-invitations') @ApiOkResponse({ type: InvitationPageDto })
  invitations(@CurrentUser() a: Principal,@Query() q: TeamHistoryQueryDto) { return this.queries.invitations(a.user.id,q); }
  @Get('team-join-requests') @ApiOkResponse({ type: JoinRequestPageDto })
  requests(@CurrentUser() a: Principal,@Query() q: TeamHistoryQueryDto) { return this.queries.requests(a.user.id,q); }
  @Get('team-contributions') @ApiOkResponse({ type: TeamContributionPageDto })
  contributions(@CurrentUser() a: Principal,@Query() q: TeamPeriodPageQueryDto) { return this.queries.contributions(q,a.user.id,undefined,true); }
}
@ApiTags('Team Invitations') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Role.VOLUNTEER) @Controller('team-invitations')
export class TeamInvitationsController {
  constructor(private readonly service: TeamsService) {}
  @Post(':id/accept') @HttpCode(200) @ApiOkResponse({ type: InvitationDto })
  accept(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.invitationAction(a.user.id,id,'accept'); }
  @Post(':id/decline') @HttpCode(200) @ApiOkResponse({ type: InvitationDto })
  decline(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.invitationAction(a.user.id,id,'decline'); }
  @Post(':id/revoke') @HttpCode(200) @ApiOkResponse({ type: InvitationDto })
  revoke(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.invitationAction(a.user.id,id,'revoke'); }
}
