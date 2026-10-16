import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/authorization.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import {
  BalanceDto,
  LedgerPageDto,
  LedgerQueryDto,
  ProgressionDto,
} from './ledger.dto.js';
import { LedgerService } from './ledger.service.js';
@ApiTags('Rewards ledger')
@ApiErrors()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}
  @Get('rewards/balance')
  @ApiOkResponse({ type: BalanceDto })
  async balance(@CurrentUser() actor: Principal): Promise<BalanceDto> {
    const state = await this.ledger.progression(actor.user.id);
    return {
      totalXP: state.totalXP,
      rewardPointsBalance: state.rewardPointsBalance,
    };
  }
  @Get('rewards/transactions')
  @ApiOkResponse({ type: LedgerPageDto })
  transactions(
    @CurrentUser() actor: Principal,
    @Query() query: LedgerQueryDto,
  ): Promise<LedgerPageDto> {
    return this.ledger.transactions(actor.user.id, query);
  }
  @Get('progression')
  @ApiOkResponse({ type: ProgressionDto })
  progression(@CurrentUser() actor: Principal): Promise<ProgressionDto> {
    return this.ledger.progression(actor.user.id);
  }
}
