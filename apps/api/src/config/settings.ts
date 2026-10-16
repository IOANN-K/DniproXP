import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from './environment.js';
@Injectable()
export class Settings {
  readonly values: Environment;
  constructor(config: ConfigService) {
    this.values = config.getOrThrow<Environment>('runtime');
  }
  get origins(): string[] {
    return this.values.CORS_ORIGINS.split(',').map((s) => s.trim());
  }
}
