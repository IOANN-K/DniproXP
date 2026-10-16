import { TeamsModule } from '../teams/teams.module.js';
import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';
import {
  ParticipationsController,
  ReportsController,
} from './participations.controller.js';
import { ParticipationsService } from './participations.service.js';
import { ParticipationQueries } from './participation.queries.js';
import { VerificationService } from './verification.service.js';
@Module({
  imports: [OrganizationsModule, QuestsModule, LedgerModule, ProgressModule, TeamsModule],
  controllers: [ParticipationsController, ReportsController],
  providers: [ParticipationsService, ParticipationQueries, VerificationService],
  exports: [VerificationService, ParticipationsService, ParticipationQueries],
})
export class ParticipationsModule {}
