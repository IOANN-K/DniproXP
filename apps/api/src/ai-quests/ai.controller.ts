import { Body,Controller,Get,Headers,HttpCode,Param,ParseUUIDPipe,Post,Query,Req,Res,UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth,ApiHeader,ApiOkResponse,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard,Roles,RolesGuard } from '../auth/authorization.js';
import { ApiErrors,DomainError } from '../common/http.js';
import type { ApiRequest,Principal } from '../common/http.js';
import { Role } from '../database/entities/domain.js';
import { ManagedQuestDto } from '../quests/quests.dto.js';
import { QuestGenerationService } from './quest-generation.service.js';
import { GenerateQuestsDto,GenerationResponseDto,GenerationSessionDto,GenerationPageDto,AiPageQueryDto,SuggestionDto,SuggestionPageDto,ConvertSuggestionDto,AiCleanupDto } from './ai.dto.js';
const uuid = new ParseUUIDPipe({ version: '4' });
function operationKey(value?: string) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new DomainError(422,'VALIDATION_FAILED','Потрібен UUID v4 у заголовку Idempotency-Key.');return value.toLowerCase();
}
async function connected<T>(req: ApiRequest,res: Response,work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController(),abort = () => { if (!res.writableEnded) controller.abort(); };
  req.once('aborted',abort);res.once('close',abort);
  try { return await work(controller.signal); } finally { req.off('aborted',abort);res.off('close',abort); }
}
@ApiTags('AI quest generation') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Role.VOLUNTEER,Role.ORGANIZER,Role.ADMIN) @Controller()
export class AiQuestController {
  constructor(private readonly service: QuestGenerationService) {}
  @Post('ai/quests/generate') @HttpCode(200) @ApiHeader({ name: 'Idempotency-Key',required: true }) @ApiOkResponse({ type: GenerationResponseDto })
  generate(@CurrentUser() a: Principal,@Body() body: GenerateQuestsDto,@Headers('idempotency-key') key: string | undefined,@Req() req: ApiRequest,@Res({ passthrough: true }) res: Response) {
    return connected(req,res,signal => this.service.generate(a.user.id,operationKey(key),body,req.requestId ?? null,signal));
  }
  @Post('quest-generations') @HttpCode(200) @ApiHeader({ name: 'Idempotency-Key',required: true }) @ApiOkResponse({ type: GenerationResponseDto })
  async compatibleGenerate(@CurrentUser() a: Principal,@Body() body: GenerateQuestsDto,@Headers('idempotency-key') key: string | undefined,@Req() req: ApiRequest,@Res({ passthrough: true }) res: Response) {
    try { return await this.generate(a,body,key,req,res); }
    catch (error) {
      // Preserve the frontend's proposed finite error enum on its existing URI.
      if (error instanceof DomainError) {
        const payload = error.getResponse();
        if (typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string') {
          if (['AI_UNAVAILABLE','AI_INVALID_OUTPUT','AI_LEASE_EXPIRED'].includes(payload.code)) throw new DomainError(503,'PROVIDER_UNAVAILABLE','AI тимчасово недоступний.');
          if (['IDEMPOTENCY_CONFLICT','GENERATION_IN_PROGRESS','GENERATION_EXPIRED','GENERATION_CANCELLED','AI_FIXTURE'].includes(payload.code)) throw new DomainError(409,'CONFLICT','Переглянь історію генерацій; повтор цього ключа не запускає AI.');
          if (payload.code === 'ORGANIZATION_SCOPE_REQUIRED') throw new DomainError(403,'FORBIDDEN','Недостатньо прав в організації.');
        }
      }
      throw error;
    }
  }
  @Get('ai/quests/generations') @ApiOkResponse({ type: GenerationPageDto })
  list(@CurrentUser() a: Principal,@Query() q: AiPageQueryDto) { return this.service.list(a.user.id,q); }
  @Get('ai/quests/generations/:id') @ApiOkResponse({ type: GenerationSessionDto })
  get(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.get(a.user.id,id); }
  @Get('ai/quests/suggestions/saved') @ApiOkResponse({ type: SuggestionPageDto })
  saved(@CurrentUser() a: Principal,@Query() q: AiPageQueryDto) { return this.service.saved(a.user.id,q); }
  @Get('ai/quests/suggestions/:id') @ApiOkResponse({ type: SuggestionDto })
  suggestion(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.suggestion(a.user.id,id); }
  @Post('ai/quests/suggestions/:id/save') @HttpCode(200) @ApiOkResponse({ type: SuggestionDto })
  save(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.save(a.user.id,id); }
  @Post('ai/quests/suggestions/:id/regenerate') @HttpCode(200) @ApiHeader({ name: 'Idempotency-Key',required: true }) @ApiOkResponse({ type: GenerationResponseDto })
  regenerate(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Headers('idempotency-key') key: string | undefined,@Req() req: ApiRequest,@Res({ passthrough: true }) res: Response) {
    return connected(req,res,signal => this.service.regenerate(a.user.id,id,operationKey(key),req.requestId ?? null,signal));
  }
  @Post('ai/quests/suggestions/:id/save-draft') @Roles(Role.ORGANIZER) @HttpCode(200) @ApiOkResponse({ type: ManagedQuestDto })
  convert(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: ConvertSuggestionDto) { return this.service.convert(a.user.id,id,body.organizationId); }
  @Post('admin/ai/cleanup') @Roles(Role.ADMIN) @HttpCode(200) @ApiOkResponse({ type: AiCleanupDto })
  cleanup(@CurrentUser() a: Principal) { return this.service.cleanup(a.user.id); }
}
