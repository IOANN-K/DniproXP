import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { AiProvider,CompatibleAiProvider } from './ai-provider.js';
import { GeneratedQuestValidator } from './generated-quest.validator.js';
import { QuestGenerationService } from './quest-generation.service.js';
import { AiQuestController } from './ai.controller.js';
@Module({ imports: [OrganizationsModule,QuestsModule],providers: [{ provide: AiProvider,useClass: CompatibleAiProvider },GeneratedQuestValidator,QuestGenerationService],controllers: [AiQuestController] })
export class AiQuestModule {}
