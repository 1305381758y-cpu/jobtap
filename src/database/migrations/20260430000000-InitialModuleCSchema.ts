import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialModuleCSchema20260430000000 implements MigrationInterface {
  name = 'InitialModuleCSchema20260430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "role" varchar NOT NULL DEFAULT 'operator',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "employerName" varchar NOT NULL,
        "countryCode" varchar(2) NOT NULL,
        "city" varchar,
        "isRemote" boolean NOT NULL,
        "salaryText" varchar NOT NULL,
        "workTimeText" varchar NOT NULL,
        "description" text NOT NULL,
        "contactUrl" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "source" varchar NOT NULL DEFAULT 'employer_submitted',
        "createdByAdminId" varchar,
        "reviewedByAdminId" varchar,
        "rejectionReason" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "reviewedAt" timestamp,
        "publishedAt" timestamp
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "analytics_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "eventType" varchar NOT NULL,
        "eventSchemaVersion" integer NOT NULL DEFAULT 1,
        "deviceId" varchar NOT NULL,
        "countryCode" varchar(2) NOT NULL,
        "jobId" varchar,
        "platform" varchar NOT NULL,
        "appVersion" varchar,
        "locale" varchar,
        "sourceScreen" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "idx_jobs_country_status_published" ON "jobs" ("countryCode", "status", "publishedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_jobs_status_source_created" ON "jobs" ("status", "source", "createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_type_country_created" ON "analytics_events" ("eventType", "countryCode", "createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_type_country_job_created" ON "analytics_events" ("eventType", "countryCode", "jobId", "createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_country_device_created" ON "analytics_events" ("countryCode", "deviceId", "createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_analytics_country_job_device_type" ON "analytics_events" ("countryCode", "jobId", "deviceId", "eventType")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_analytics_country_job_device_type"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_analytics_country_device_created"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_analytics_type_country_job_created"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_analytics_type_country_created"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_jobs_status_source_created"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_jobs_country_status_published"');
    await queryRunner.query('DROP TABLE IF EXISTS "analytics_events"');
    await queryRunner.query('DROP TABLE IF EXISTS "jobs"');
    await queryRunner.query('DROP TABLE IF EXISTS "admin_users"');
  }
}
