import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'jobtap-module-c',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      service: 'jobtap-module-c',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
