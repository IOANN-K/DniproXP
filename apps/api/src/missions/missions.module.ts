import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { MissionsController, MyMissionsController, AdminMissionsController } from './missions.controller.js';
@Module({ imports: [ProgressModule], controllers: [MissionsController, MyMissionsController, AdminMissionsController] })
export class MissionsModule {}
