import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { RewardsService } from './rewards.service.js';
import { RewardsCatalogController,RewardManagementController,RewardRedemptionsController } from './rewards.controller.js';
@Module({ imports: [LedgerModule,OrganizationsModule],providers: [RewardsService],controllers: [RewardsCatalogController,RewardManagementController,RewardRedemptionsController],exports: [RewardsService] })
export class RewardsCatalogModule {}
