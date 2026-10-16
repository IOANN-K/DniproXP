import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { ChallengesController, MyChallengesController, AdminChallengesController } from './challenges.controller.js';
@Module({ imports: [ProgressModule], controllers: [ChallengesController, MyChallengesController, AdminChallengesController] })
export class ChallengesModule {}
