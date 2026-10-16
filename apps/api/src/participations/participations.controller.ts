import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/authorization.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { OrganizerRoute, VolunteerRoute } from '../quests/http.decorators.js';
import { ReasonDto } from '../quests/quests.dto.js';
import { ParticipationsService } from './participations.service.js';
import { ParticipationQueries } from './participation.queries.js';
import { VerificationService } from './verification.service.js';
import {
  ApplicationDto,
  ApplicationPageDto,
  ApplicationQueryDto,
  ParticipationDto,
  ParticipationPageDto,
  ParticipationQueryDto,
  CreateReportDto,
  ReportDto,
  ReportPageDto,
  ReportQueryDto,
  VerificationDto,
  CancelParticipationDto,
} from './participation.dto.js';
class ApplyQuestDto {
  @ApiPropertyOptional({
    enum: ['individual'],
    description:
      'Team application is deferred to BE-04; teamId/userId are rejected',
  })
  @ValidateIf((_o: unknown, v: unknown) => v !== undefined)
  @IsIn(['individual'])
  mode?: 'individual';
}
@ApiTags('Applications and participations')
@ApiErrors()
@Controller()
export class ParticipationsController {
  constructor(
    private readonly service: ParticipationsService,
    private readonly queries: ParticipationQueries,
  ) {}
  @Post('quests/:id/applications')
  @VolunteerRoute()
  @ApiCreatedResponse({ type: ApplicationDto })
  @ApiOperation({
    summary:
      'Own individual application; pending reserves one seat; duplicate returns same application',
  })
  apply(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() _input: ApplyQuestDto,
  ): Promise<ApplicationDto> {
    return this.service.apply(actor.user.id, id);
  }
  @Get('quests/:id/applications')
  @OrganizerRoute('Active staff: applications for own quest only')
  @ApiOkResponse({ type: ApplicationPageDto })
  applications(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationPageDto> {
    return this.queries.applications(actor.user.id, query, id);
  }
  @Get('users/me/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ApplicationPageDto })
  mine(
    @CurrentUser() actor: Principal,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationPageDto> {
    return this.queries.applications(actor.user.id, query);
  }
  @Post('applications/:id/approve')
  @HttpCode(200)
  @OrganizerRoute('Authorized staff: approve one reserved seat')
  @ApiOkResponse({ type: ApplicationDto })
  approve(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApplicationDto> {
    return this.service.review(actor.user.id, id, true, null);
  }
  @Post('applications/:id/reject')
  @HttpCode(200)
  @OrganizerRoute('Authorized staff: reject with reason and release seat')
  @ApiOkResponse({ type: ApplicationDto })
  reject(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ReasonDto,
  ): Promise<ApplicationDto> {
    return this.service.review(actor.user.id, id, false, body.reason);
  }
  @Post('applications/:id/withdraw')
  @HttpCode(200)
  @VolunteerRoute()
  @ApiOkResponse({ type: ApplicationDto })
  withdraw(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApplicationDto> {
    return this.service.withdraw(actor.user.id, id);
  }
  @Get('users/me/participations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ParticipationPageDto })
  participations(
    @CurrentUser() actor: Principal,
    @Query() query: ParticipationQueryDto,
  ): Promise<ParticipationPageDto> {
    return this.queries.participations(actor.user.id, query);
  }
  @Get('quests/:id/participants')
  @OrganizerRoute('Active staff only; never a public volunteer roster')
  @ApiOkResponse({ type: ParticipationPageDto })
  participants(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ParticipationQueryDto,
  ): Promise<ParticipationPageDto> {
    return this.queries.participations(actor.user.id, query, id);
  }
  @Post('participations/:id/start')
  @HttpCode(200)
  @VolunteerRoute()
  @ApiOkResponse({ type: ParticipationDto })
  start(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ParticipationDto> {
    return this.service.start(actor.user.id, id);
  }
  @Post('participations/:id/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ParticipationDto })
  @ApiOperation({
    summary:
      'Owner before start, or organization OWNER/MANAGER with reason; never completed participation',
  })
  cancel(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CancelParticipationDto,
  ): Promise<ParticipationDto> {
    return this.service.cancel(actor.user.id, id, body.reason);
  }
}
@ApiTags('Participation reports')
@ApiErrors()
@Controller()
export class ReportsController {
  constructor(
    private readonly service: ParticipationsService,
    private readonly queries: ParticipationQueries,
    private readonly verification: VerificationService,
  ) {}
  @Post('participations/:id/reports')
  @VolunteerRoute()
  @ApiCreatedResponse({ type: ReportDto })
  @ApiOperation({
    summary: 'Own approved participation only; submit creates no reward',
  })
  submit(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateReportDto,
  ): Promise<ReportDto> {
    return this.service.submitReport(actor.user.id, id, body);
  }
  @Get('participations/:id/reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ReportPageDto })
  @ApiOperation({
    summary: 'Own report history or active organization staff only',
  })
  history(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ReportQueryDto,
  ): Promise<ReportPageDto> {
    return this.queries.reports(actor.user.id, id, query);
  }
  @Get('organizations/:id/reports/pending')
  @OrganizerRoute('Active staff: own organization report queue')
  @ApiOkResponse({ type: ReportPageDto })
  pending(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ReportQueryDto,
  ): Promise<ReportPageDto> {
    return this.queries.pending(actor.user.id, id, query);
  }
  @Post('reports/:id/approve')
  @HttpCode(200)
  @OrganizerRoute(
    'Authorized reviewer: atomic, idempotent verification; rewards taken from quest',
  )
  @ApiOkResponse({ type: VerificationDto })
  approve(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<VerificationDto> {
    return this.verification.approve(actor.user.id, id);
  }
  @Post('reports/:id/reject')
  @HttpCode(200)
  @OrganizerRoute(
    'Authorized reviewer: reject with reason; retain history and allow new report',
  )
  @ApiOkResponse({ type: ReportDto })
  reject(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ReasonDto,
  ): Promise<ReportDto> {
    return this.verification.reject(actor.user.id, id, body.reason);
  }
}
