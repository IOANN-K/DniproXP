import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ApiErrors, DomainError } from '../common/http.js';
class HealthDto {
  @ApiProperty({ enum: ['ok'] }) status: 'ok';
}
class ReadinessDto extends HealthDto {
  @ApiProperty({ enum: ['up'] }) database: 'up';
}
@ApiTags('Health')
@ApiErrors()
@Controller('health')
export class HealthController {
  constructor(private readonly source: DataSource) {}
  @Get()
  @ApiOkResponse({ type: HealthDto })
  live(): HealthDto {
    return { status: 'ok' };
  }
  @Get('ready')
  @ApiOkResponse({ type: ReadinessDto })
  async ready(): Promise<ReadinessDto> {
    try {
      if (!this.source.isInitialized) throw new Error('Not connected');
      await this.source.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      throw new DomainError(
        503,
        'DATABASE_UNAVAILABLE',
        'База даних недоступна.',
      );
    }
  }
}
