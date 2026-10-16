import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { DataSource } from 'typeorm';
import { parseEnvironment } from '../config/environment.js';
import { databaseOptions } from './typeorm.config.js';
for (const path of ['apps/api/.env', '.env']) {
  if (existsSync(path)) {
    loadEnvFile(path);
    break;
  }
}
export default new DataSource(databaseOptions(parseEnvironment(process.env)));
