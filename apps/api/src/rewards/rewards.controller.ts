import { Body,Controller,Get,Headers,HttpCode,Param,ParseUUIDPipe,Patch,Post,Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiCreatedResponse,ApiHeader,ApiOkResponse,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard,Roles,RolesGuard } from '../auth/authorization.js';
import { ApiErrors,DomainError } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { Role } from '../database/entities/domain.js';
import { ReasonDto } from '../quests/quests.dto.js';
import { RewardsService } from './rewards.service.js';
import { RewardFormDto,UpdateRewardDto,RewardQueryDto,RewardHistoryQueryDto,RedeemRewardDto,RewardDto,RewardPageDto,RedemptionDto,RedemptionPageDto,RedemptionResultDto,FulfillmentPageDto } from './rewards.dto.js';
const uuid = new ParseUUIDPipe({ version: '4' });
function key(value?: string) { if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new DomainError(422,'VALIDATION_FAILED','Потрібен UUID v4 у заголовку Idempotency-Key.');return value.toLowerCase(); }
@ApiTags('Reward catalog') @ApiErrors() @Controller('rewards/catalog')
export class RewardsCatalogController {
  constructor(private readonly service: RewardsService) {}
  @Get() @ApiOkResponse({ type: RewardPageDto }) list(@Query() q: RewardQueryDto) { return this.service.list(q); }
  @Get(':id') @ApiOkResponse({ type: RewardDto }) get(@Param('id',uuid) id: string) { return this.service.get(id); }
}
@ApiTags('Reward management') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Role.ADMIN,Role.ORGANIZER) @Controller('rewards/catalog')
export class RewardManagementController {
  constructor(private readonly service: RewardsService) {}
  @Post() @ApiCreatedResponse({ type: RewardDto }) create(@CurrentUser() a: Principal,@Body() body: RewardFormDto) { return this.service.create(a.user.id,body); }
  @Patch(':id') @ApiOkResponse({ type: RewardDto }) update(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: UpdateRewardDto) { return this.service.update(a.user.id,id,body); }
  @Post(':id/archive') @HttpCode(200) @ApiOkResponse({ type: RewardDto }) archive(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.update(a.user.id,id,null); }
  @Get(':id/manage') @ApiOkResponse({ type: RewardDto }) managed(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.managedGet(a.user.id,id); }
  @Get(':id/redemptions') @ApiOkResponse({ type: FulfillmentPageDto }) queue(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Query() q: RewardHistoryQueryDto) { return this.service.fulfillmentQueue(a.user.id,id,q); }
}
@ApiTags('Reward redemptions') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Controller()
export class RewardRedemptionsController {
  constructor(private readonly service: RewardsService) {}
  @Post('rewards/redemptions') @Roles(Role.VOLUNTEER) @ApiHeader({ name: 'Idempotency-Key',required: true }) @ApiCreatedResponse({ type: RedemptionResultDto })
  redeem(@CurrentUser() a: Principal,@Body() body: RedeemRewardDto,@Headers('idempotency-key') operation: string | undefined) { return this.service.redeem(a.user.id,body.rewardId,key(operation)); }
  @Post('rewards/:id/redemptions') @Roles(Role.VOLUNTEER) @ApiHeader({ name: 'Idempotency-Key',required: true }) @ApiCreatedResponse({ type: RedemptionResultDto })
  redeemAlias(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Headers('idempotency-key') operation: string | undefined) { return this.service.redeem(a.user.id,id,key(operation)); }
  @Get('organizations/:id/rewards/catalog') @Roles(Role.ORGANIZER,Role.ADMIN) @ApiOkResponse({ type: RewardPageDto })
  organizationCatalog(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Query() q: RewardHistoryQueryDto) { return this.service.managedList(a.user.id,id,q); }
  @Get('admin/rewards/catalog') @Roles(Role.ADMIN) @ApiOkResponse({ type: RewardPageDto })
  allCatalog(@CurrentUser() a: Principal,@Query() q: RewardHistoryQueryDto) { return this.service.managedList(a.user.id,null,q); }
  @Get('users/me/rewards/redemptions') @ApiOkResponse({ type: RedemptionPageDto })
  own(@CurrentUser() a: Principal,@Query() q: RewardHistoryQueryDto) { return this.service.own(a.user.id,q); }
  @Get('rewards/redemptions/:id') @ApiOkResponse({ type: RedemptionDto })
  get(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.redemption(a.user.id,id); }
  @Post('rewards/redemptions/:id/fulfill') @HttpCode(200) @Roles(Role.ADMIN,Role.ORGANIZER) @ApiOkResponse({ type: RedemptionDto })
  fulfill(@CurrentUser() a: Principal,@Param('id',uuid) id: string) { return this.service.transition(a.user.id,id,'fulfill',null); }
  @Post('rewards/redemptions/:id/cancel') @HttpCode(200) @ApiOkResponse({ type: RedemptionDto })
  cancel(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Body() body: ReasonDto) { return this.service.transition(a.user.id,id,'cancel',body.reason); }
}
