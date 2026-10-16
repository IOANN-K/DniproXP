import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../auth/authorization.js';
import { Role } from '../database/entities/domain.js';
import { ApiErrors } from '../common/http.js';
import type { Principal, ApiRequest } from '../common/http.js';
import { QuestsService } from './quests.service.js';
import { QuestQueries } from './quest.queries.js';
import { OptionalJwtGuard } from './optional-jwt.guard.js';
import { OrganizerRoute } from './http.decorators.js';
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestQueryDto,
  QuestDto,
  ManagedQuestDto,
  QuestPageDto,
  ManagedQuestPageDto,
  ReasonDto,
} from './quests.dto.js';
@ApiTags('Quests')
@ApiErrors()
@Controller('quests')
export class QuestsController {
  constructor(
    private readonly service: QuestsService,
    private readonly queries: QuestQueries,
  ) {}
  @Get()
  @ApiOkResponse({ type: QuestPageDto })
  @ApiOperation({ summary: 'Public published quests; drafts never included' })
  list(@Query() query: QuestQueryDto): Promise<QuestPageDto> {
    return this.queries.list(query);
  }
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiExtraModels(QuestDto, ManagedQuestDto)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(QuestDto) },
        { $ref: getSchemaPath(ManagedQuestDto) },
      ],
    },
  })
  @ApiOperation({
    summary:
      'Public detail; optional bearer grants own staff/private or explicit ADMIN read access',
  })
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: ApiRequest,
  ): Promise<QuestDto | ManagedQuestDto> {
    return this.queries.get(id, req.principal);
  }
  @Post()
  @OrganizerRoute('OWNER/MANAGER: create draft')
  @ApiCreatedResponse({ type: ManagedQuestDto })
  create(
    @CurrentUser() actor: Principal,
    @Body() input: CreateQuestDto,
  ): Promise<ManagedQuestDto> {
    return this.service.create(actor.user.id, input);
  }
  @Patch(':id')
  @OrganizerRoute('OWNER/MANAGER: edit before first application; reset review')
  @ApiOkResponse({ type: ManagedQuestDto })
  update(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: UpdateQuestDto,
  ): Promise<ManagedQuestDto> {
    return this.service.update(actor.user.id, id, input);
  }
  @Post(':id/submit-review')
  @HttpCode(200)
  @OrganizerRoute(
    'OWNER/MANAGER: submit complete draft of approved organization',
  )
  @ApiOkResponse({ type: ManagedQuestDto })
  review(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.transition(actor.user.id, id, 'submit-review');
  }
  @Post(':id/publish')
  @HttpCode(200)
  @OrganizerRoute('OWNER/MANAGER: publish approved future quest')
  @ApiOkResponse({ type: ManagedQuestDto })
  publish(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.transition(actor.user.id, id, 'publish');
  }
  @Post(':id/start')
  @HttpCode(200)
  @OrganizerRoute('OWNER/MANAGER: start when scheduled time arrives')
  @ApiOkResponse({ type: ManagedQuestDto })
  start(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.transition(actor.user.id, id, 'start');
  }
  @Post(':id/cancel')
  @HttpCode(200)
  @OrganizerRoute('OWNER/MANAGER: cancel; preserve verified history')
  @ApiOkResponse({ type: ManagedQuestDto })
  cancel(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.transition(actor.user.id, id, 'cancel');
  }
  @Post(':id/complete')
  @HttpCode(200)
  @OrganizerRoute(
    'OWNER/MANAGER: complete only after resolving applications and participations',
  )
  @ApiOkResponse({ type: ManagedQuestDto })
  complete(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.transition(actor.user.id, id, 'complete');
  }
  @Post(':id/archive')
  @HttpCode(200)
  @OrganizerRoute('OWNER/MANAGER: archive completed/cancelled quest')
  @ApiOkResponse({ type: ManagedQuestDto })
  archive(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.transition(actor.user.id, id, 'archive');
  }
}
@ApiTags('Organization quests')
@ApiErrors()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationQuestsController {
  constructor(private readonly queries: QuestQueries) {}
  @Get(':id/quests')
  @ApiOkResponse({ type: ManagedQuestPageDto })
  @ApiOperation({
    summary: 'Active staff only, all own lifecycles including drafts',
  })
  list(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: QuestQueryDto,
  ): Promise<QuestPageDto | ManagedQuestPageDto> {
    return this.queries.list(query, id, actor.user.id);
  }
}
@ApiTags('Quest moderation')
@ApiErrors()
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/quests')
export class AdminQuestsController {
  constructor(
    private readonly service: QuestsService,
    private readonly queries: QuestQueries,
  ) {}
  @Get('pending')
  @ApiOkResponse({ type: ManagedQuestPageDto })
  @ApiOperation({ summary: 'ADMIN moderation queue' })
  list(
    @Query() query: QuestQueryDto,
  ): Promise<QuestPageDto | ManagedQuestPageDto> {
    return this.queries.list(query, undefined, undefined, true);
  }
  @Post(':id/approve')
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedQuestDto })
  @ApiOperation({
    summary: 'ADMIN: approve submitted draft; no self moderation',
  })
  approve(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedQuestDto> {
    return this.service.moderate(actor.user.id, id, true, null);
  }
  @Post(':id/reject')
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedQuestDto })
  @ApiOperation({ summary: 'ADMIN: reject with reason' })
  reject(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: ReasonDto,
  ): Promise<ManagedQuestDto> {
    return this.service.moderate(actor.user.id, id, false, input.reason);
  }
}
