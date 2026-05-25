import { QueryRunner } from 'typeorm';
import { AddAnalyticsEventSchemaVersion20260512000000 } from '../src/database/migrations/20260512000000-AddAnalyticsEventSchemaVersion';

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
