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
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
