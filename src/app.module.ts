import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { AdminUser } from './database/entities/admin-user.entity';
import { AnalyticsEvent } from './database/entities/analytics-event.entity';
import { Job } from './database/entities/job.entity';
import { JobsModule } from './jobs/jobs.module';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      isTest
        ? {
            type: 'sqljs',
            autoSave: false,
            entities: [Job, AdminUser, AnalyticsEvent],
            synchronize: true,
            retryAttempts: 0,
          }
        : {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            host: process.env.POSTGRES_HOST ?? 'localhost',
            port: Number(process.env.POSTGRES_PORT ?? 5432),
            username: process.env.POSTGRES_USER ?? 'jobtap',
            password: process.env.POSTGRES_PASSWORD ?? 'jobtap',
            database: process.env.POSTGRES_DB ?? 'jobtap',
            entities: [Job, AdminUser, AnalyticsEvent],
            synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
          },
    ),
    AuthModule,
    JobsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
