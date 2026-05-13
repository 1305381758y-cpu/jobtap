import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalyticsEventSchemaVersion20260512000000 implements MigrationInterface {
  name = 'AddAnalyticsEventSchemaVersion20260512000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "analytics_events" ADD COLUMN "eventSchemaVersion" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "eventSchemaVersion"`,
    );
  }
}
