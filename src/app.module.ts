import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { getDatabaseOptions } from './database/database-options';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseOptions(isTest)),
    AuthModule,
    JobsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
