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
@Module({
  imports: [
    SettingsModule,
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
