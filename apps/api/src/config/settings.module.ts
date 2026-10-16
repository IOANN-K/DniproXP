import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseEnvironment } from './environment.js';
import { Settings } from './settings.js';
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validate: (input: Record<string, unknown>) => ({
        runtime: parseEnvironment(input),
      }),
    }),
  ],
  providers: [Settings],
  exports: [Settings],
})
export class SettingsModule {}
