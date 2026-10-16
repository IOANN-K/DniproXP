import { Body,Controller,Get,HttpCode,Param,ParseUUIDPipe,Post,Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiCreatedResponse,ApiOkResponse,ApiOperation,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard,Roles,RolesGuard } from '../auth/authorization.js';
import { Role } from '../database/entities/domain.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { ReasonDto } from '../quests/quests.dto.js';
import { TeamApplicationsService } from './team-applications.service.js';
import { TeamApplicationInputDto,TeamApplicationDto,TeamApplicationPageDto,TeamHistoryQueryDto } from '../teams/team.dto.js';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Team quest applications') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Controller()
export class TeamApplicationsController {
  constructor(private readonly service: TeamApplicationsService) {}
  @Post('quests/:id/team-applications') @Roles(Role.VOLUNTEER) @ApiCreatedResponse({ type: TeamApplicationDto }) @ApiOperation({ summary: 'OWNER/MANAGER команди: зарезервувати місця конкретним активним учасникам; стабільний operationId' })
  apply(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: TeamApplicationInputDto) { return this.service.apply(a.user.id,id,body); }
  @Get('quests/:id/team-applications') @Roles(Role.ORGANIZER) @ApiOkResponse({ type: TeamApplicationPageDto })
  quest(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Query() q: TeamHistoryQueryDto) { return this.service.list(a.user.id,q,{ questId: id }); }
  @Get('teams/:id/quest-applications') @Roles(Role.VOLUNTEER) @ApiOkResponse({ type: TeamApplicationPageDto })
  team(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Query() q: TeamHistoryQueryDto) { return this.service.list(a.user.id,q,{ teamId: id }); }
  @Post('team-applications/:id/approve') @HttpCode(200) @Roles(Role.ORGANIZER) @ApiOkResponse({ type: TeamApplicationDto }) @ApiOperation({ summary: 'Scoped організатор: атомарно схвалити кожну індивідуальну заявку BE-02; без нагород до verification' })
  approve(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.review(a.user.id,id,true,null); }
  @Post('team-applications/:id/reject') @HttpCode(200) @Roles(Role.ORGANIZER) @ApiOkResponse({ type: TeamApplicationDto })
  reject(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: ReasonDto) { return this.service.review(a.user.id,id,false,body.reason); }
  @Post('team-applications/:id/withdraw') @HttpCode(200) @Roles(Role.VOLUNTEER) @ApiOkResponse({ type: TeamApplicationDto })
  withdraw(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.withdraw(a.user.id,id); }
}
