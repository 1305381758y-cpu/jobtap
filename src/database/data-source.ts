import 'dotenv/config';
import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './database-options';

export const AppDataSource = new DataSource({
  ...getDataSourceOptions(),
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
