import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAccountManagement20260430001000 implements MigrationInterface {
  name = 'AddAdminAccountManagement20260430001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_users" ADD COLUMN "status" varchar NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(`ALTER TABLE "admin_users" ADD COLUMN "lastLoginAt" timestamp`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "status"`);
  }
}
