import { QueryRunner } from 'typeorm';
import { AddAdminAccountManagement20260430001000 } from '../src/database/migrations/20260430001000-AddAdminAccountManagement';
import { AddAnalyticsEventSchemaVersion20260512000000 } from '../src/database/migrations/20260512000000-AddAnalyticsEventSchemaVersion';
import { AppDataSource } from '../src/database/data-source';

describe('analytics schema version migration', () => {
  it('adds eventSchemaVersion when the column is missing', async () => {
    const migration = new AddAnalyticsEventSchemaVersion20260512000000();
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue({ columns: [] }),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await migration.up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      `ALTER TABLE "analytics_events" ADD COLUMN "eventSchemaVersion" integer NOT NULL DEFAULT 1`,
    );
  });

  it('does not add eventSchemaVersion twice', async () => {
    const migration = new AddAnalyticsEventSchemaVersion20260512000000();
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue({ columns: [{ name: 'eventSchemaVersion' }] }),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await migration.up(queryRunner);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });
});

describe('admin account management migration', () => {
  it('adds account management columns when they are missing', async () => {
    const migration = new AddAdminAccountManagement20260430001000();
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue({ columns: [] }),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await migration.up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      `ALTER TABLE "admin_users" ADD COLUMN "status" varchar NOT NULL DEFAULT 'active'`,
    );
    expect(queryRunner.query).toHaveBeenCalledWith(
      `ALTER TABLE "admin_users" ADD COLUMN "lastLoginAt" timestamp`,
    );
  });

  it('does not add account management columns twice', async () => {
    const migration = new AddAdminAccountManagement20260430001000();
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue({
        columns: [{ name: 'status' }, { name: 'lastLoginAt' }],
      }),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await migration.up(queryRunner);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });

  it('adds only missing account management columns in a partial migration state', async () => {
    const migration = new AddAdminAccountManagement20260430001000();
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue({
        columns: [{ name: 'status' }],
      }),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await migration.up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    expect(queryRunner.query).toHaveBeenCalledWith(
      `ALTER TABLE "admin_users" ADD COLUMN "lastLoginAt" timestamp`,
    );
  });
});

describe('production migration data source', () => {
  it('uses a migration glob that works from both src and dist builds', () => {
    expect(AppDataSource.options.migrations).toEqual([
      expect.stringMatching(/database\/migrations\/\*\.\{ts,js\}$/),
    ]);
  });
});
