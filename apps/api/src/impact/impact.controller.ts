import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/authorization.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { Role } from '../database/entities/domain.js';
import { ImpactService } from './impact.service.js';
import { ImpactFilterDto, ImpactOverviewDto, ImpactGroupDto, ReceiptDto, ReceiptPageDto, ReceiptQueryDto, PublicReceiptDto, MeasurementDto, CollectiveMeasurementDto } from './impact.dto.js';

@ApiTags('City Impact')
@ApiErrors()
@Controller('impact')
export class ImpactController {
  constructor(private readonly service: ImpactService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Підтверджений внесок міста; відсутні виміри — null; календарні дні Europe/Kyiv' })
  @ApiOkResponse({ type: ImpactOverviewDto })
  summary(@Query() input: ImpactFilterDto): Promise<ImpactOverviewDto> { return this.service.summary(input); }

  @Get('districts')
  @ApiOkResponse({ type: ImpactGroupDto, isArray: true })
  districts(@Query() input: ImpactFilterDto): Promise<ImpactGroupDto[]> { return this.service.groups(input, 'district'); }

  @Get('categories')
  @ApiOkResponse({ type: ImpactGroupDto, isArray: true })
  categories(@Query() input: ImpactFilterDto): Promise<ImpactGroupDto[]> { return this.service.groups(input, 'category'); }

  @Get('receipts/public/:reference')
  @ApiOperation({ summary: 'Перевірка за непередбачуваним reference; лише дозволені власником поля, інакше 404' })
  @ApiOkResponse({ type: PublicReceiptDto })
  publicReceipt(@Param('reference', new ParseUUIDPipe({ version: '4' })) reference: string): Promise<PublicReceiptDto> { return this.service.publicReceipt(reference); }

  @Get('receipts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Приватна квитанція, доступна лише власнику; іншим 404' })
  @ApiOkResponse({ type: ReceiptDto })
  receipt(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ReceiptDto> { return this.service.receipt(actor.user.id, id); }
}

@ApiTags('My Impact')
@ApiErrors()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/impact')
export class MyImpactController {
  constructor(private readonly service: ImpactService) {}
  @Get()
  @ApiOperation({ summary: 'Власний підтверджений внесок; спільні фізичні виміри не приписуються особі' })
  @ApiOkResponse({ type: ImpactOverviewDto })
  summary(@CurrentUser() actor: Principal, @Query() input: ImpactFilterDto): Promise<ImpactOverviewDto> { return this.service.summary(input, actor.user.id); }

  @Get('receipts')
  @ApiOkResponse({ type: ReceiptPageDto })
  receipts(@CurrentUser() actor: Principal, @Query() input: ReceiptQueryDto): Promise<ReceiptPageDto> { return this.service.receipts(actor.user.id, input); }
}

@ApiTags('Organization Impact')
@ApiErrors()
@Controller('organizations')
export class OrganizationImpactController {
  constructor(private readonly service: ImpactService) {}
  @Get(':id/impact')
  @ApiOperation({ summary: 'Знеособлений підтверджений внесок схваленої організації' })
  @ApiOkResponse({ type: ImpactOverviewDto })
  impact(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query() input: ImpactFilterDto): Promise<ImpactOverviewDto> { return this.service.organization(id, input); }
}

@ApiTags('Collective Impact measurements')
@ApiErrors()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
@Controller('quests')
export class CollectiveMeasurementsController {
  constructor(private readonly service: ImpactService) {}
  @Get(':id/impact/measurements')
  @ApiOkResponse({ type: CollectiveMeasurementDto, isArray: true })
  @ApiOperation({ summary: 'Scoped verify staff: поточні виміри та revision IDs для подальшого виправлення' })
  measurements(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<CollectiveMeasurementDto[]> { return this.service.measurements(actor.user.id, id); }

  @Post(':id/impact/measurements')
  @HttpCode(201)
  @ApiCreatedResponse({ type: CollectiveMeasurementDto })
  @ApiOperation({ summary: 'Активний OWNER/MANAGER/REVIEWER цього квесту: підтвердити загальний вимір або його нову версію; повтор operationId ідемпотентний' })
  measure(@CurrentUser() actor: Principal, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() input: MeasurementDto): Promise<CollectiveMeasurementDto> { return this.service.measure(actor.user.id, id, input); }
}
