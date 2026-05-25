import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './database-options';

export const AppDataSource = new DataSource({
  ...getDataSourceOptions(),
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
