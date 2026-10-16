import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module.js';
import { SkillsModule } from '../skills/skills.module.js';
import { AchievementsModule } from '../achievements/achievements.module.js';
import { ImpactModule } from '../impact/impact.module.js';
import { VolunteerPassportService } from './passport.service.js';
import { MyPassportController,PublicPassportController } from './passport.controller.js';
@Module({ imports: [LedgerModule,SkillsModule,AchievementsModule,ImpactModule],providers: [VolunteerPassportService],controllers: [MyPassportController,PublicPassportController],exports: [VolunteerPassportService] })
export class VolunteerPassportModule {}
