import { Module } from '@nestjs/common';
import { OptionalJwtGuard } from '../quests/optional-jwt.guard.js';
import { TeamAccess } from './team-access.service.js';
import { TeamQueries } from './team.queries.js';
import { TeamsService } from './teams.service.js';
import { TeamsController,TeamCommandsController,MyTeamsController,TeamInvitationsController } from './teams.controller.js';
@Module({ providers: [TeamAccess,TeamQueries,TeamsService,OptionalJwtGuard],controllers: [TeamsController,TeamCommandsController,MyTeamsController,TeamInvitationsController],exports: [TeamAccess,TeamQueries,TeamsService,OptionalJwtGuard] })
export class TeamsModule {}
