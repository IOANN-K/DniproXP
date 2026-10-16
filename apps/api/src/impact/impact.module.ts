import { Module } from '@nestjs/common';
import { QuestsModule } from '../quests/quests.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { ImpactService } from './impact.service.js';
import { ImpactController, MyImpactController, OrganizationImpactController, CollectiveMeasurementsController } from './impact.controller.js';

@Module({
  imports: [QuestsModule, ProgressModule],
  providers: [ImpactService],
  controllers: [ImpactController, MyImpactController, OrganizationImpactController, CollectiveMeasurementsController],
  exports: [ImpactService],
})
export class ImpactModule {}
