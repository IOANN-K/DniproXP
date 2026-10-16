import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { QuestsService } from './quests.service.js';
import { QuestQueries } from './quest.queries.js';
import { QuestPolicy } from './quest.policy.js';
import { OptionalJwtGuard } from './optional-jwt.guard.js';
import {
  QuestsController,
  OrganizationQuestsController,
  AdminQuestsController,
} from './quests.controller.js';
@Module({
  imports: [OrganizationsModule],
  controllers: [
    QuestsController,
    OrganizationQuestsController,
    AdminQuestsController,
  ],
  providers: [QuestsService, QuestQueries, QuestPolicy, OptionalJwtGuard],
  exports: [QuestPolicy, QuestQueries, QuestsService],
})
export class QuestsModule {}
