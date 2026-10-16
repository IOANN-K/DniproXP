import { Module } from '@nestjs/common';
import { SkillProgressEngine } from './skill-progress.engine.js';
import { SkillsController,MySkillsController,PublicSkillsController } from './skills.controller.js';
@Module({ providers: [SkillProgressEngine],controllers: [SkillsController,MySkillsController,PublicSkillsController],exports: [SkillProgressEngine] })
export class SkillsModule {}
