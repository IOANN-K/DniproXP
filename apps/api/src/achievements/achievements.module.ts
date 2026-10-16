import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module.js';
import { AchievementEvaluator } from './achievement-evaluator.js';
import { AchievementsService } from './achievements.service.js';
import { AchievementsController,MyAchievementsController,PublicAchievementsController,TeamAchievementsController } from './achievements.controller.js';
@Module({ imports: [TeamsModule],providers: [AchievementEvaluator,AchievementsService],controllers: [AchievementsController,MyAchievementsController,PublicAchievementsController,TeamAchievementsController],exports: [AchievementsService,AchievementEvaluator] })
export class AchievementsModule {}
