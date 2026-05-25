import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { AdminUser } from '../database/entities/admin-user.entity';
import { AnalyticsEvent } from '../database/entities/analytics-event.entity';
import { Job } from '../database/entities/job.entity';
import { requireProductionEnv } from '../config/env';

const SHARED_ENTITIES = [Job, AdminUser, AnalyticsEvent];
requireProductionEnv();

export function getDatabaseOptions(isTest: boolean): TypeOrmModuleOptions {
  if (isTest) {
    return {
      type: 'sqljs',
      autoSave: false,
      entities: SHARED_ENTITIES,
      synchronize: true,
      retryAttempts: 0,
    };
  }

  return getDataSourceOptions();
}

export function getDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    username: process.env.POSTGRES_USER ?? 'jobtap',
    password: process.env.POSTGRES_PASSWORD ?? 'jobtap',
    database: process.env.POSTGRES_DB ?? 'jobtap',
    entities: SHARED_ENTITIES,
    synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
  };
}
