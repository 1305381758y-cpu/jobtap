import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAccountManagement20260430001000 implements MigrationInterface {
  name = 'AddAdminAccountManagement20260430001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin_users');
    const columns = new Set(table?.columns.map((column) => column.name) ?? []);

    if (!columns.has('status')) {
      await queryRunner.query(
        `ALTER TABLE "admin_users" ADD COLUMN "status" varchar NOT NULL DEFAULT 'active'`,
      );
    }

    if (!columns.has('lastLoginAt')) {
      await queryRunner.query(`ALTER TABLE "admin_users" ADD COLUMN "lastLoginAt" timestamp`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "status"`);
  }
}
