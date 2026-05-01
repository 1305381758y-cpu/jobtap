import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { Job } from './entities/job.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'jobtap',
  password: process.env.POSTGRES_PASSWORD ?? 'jobtap',
  database: process.env.POSTGRES_DB ?? 'jobtap',
  entities: [Job, AdminUser, AnalyticsEvent],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
