import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { ParticipationsModule } from '../participations/participations.module.js';
import { TeamApplicationsService } from './team-applications.service.js';
import { TeamApplicationsController } from './team-applications.controller.js';
@Module({ imports: [TeamsModule,QuestsModule,ParticipationsModule],providers: [TeamApplicationsService],controllers: [TeamApplicationsController],exports: [TeamApplicationsService] })
export class TeamApplicationsModule {}
