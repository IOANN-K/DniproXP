import { AiQuestModule } from './ai-quests/ai-quest.module.js';
import { RewardsCatalogModule } from './rewards/rewards-catalog.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { TeamApplicationsModule } from './team-applications/team-applications.module.js';
import { SkillsModule } from './skills/skills.module.js';
import { AchievementsModule } from './achievements/achievements.module.js';
import { VolunteerPassportModule } from './passport/passport.module.js';
import { ImpactModule } from './impact/impact.module.js';
import { MissionsModule } from './missions/missions.module.js';
import { ChallengesModule } from './challenges/challenges.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SettingsModule } from './config/settings.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { HealthController } from './health/health.controller.js';
import { QuestsModule } from './quests/quests.module.js';
import { ParticipationsModule } from './participations/participations.module.js';
import { LedgerModule } from './ledger/ledger.module.js';
@Module({
  imports: [
    SettingsModule,
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    QuestsModule,
    ParticipationsModule,
    LedgerModule,
    ImpactModule,
    MissionsModule,
    ChallengesModule,
    TeamsModule,
    TeamApplicationsModule,
    SkillsModule,
    AchievementsModule,
    VolunteerPassportModule,
    AiQuestModule,
    RewardsCatalogModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
