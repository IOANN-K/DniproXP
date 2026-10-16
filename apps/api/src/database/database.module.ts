import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Settings } from '../config/settings.js';
import { databaseOptions } from './typeorm.config.js';
@Injectable()
export class Transactions {
  constructor(private readonly source: DataSource) {}
  run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.source.transaction(work);
  }
}
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [Settings],
      useFactory: (settings: Settings) => databaseOptions(settings.values),
    }),
  ],
  providers: [Transactions],
  exports: [TypeOrmModule, Transactions],
})
export class DatabaseModule {}
