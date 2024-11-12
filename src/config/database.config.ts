import { ConfigType, registerAs } from '@nestjs/config';
import { env, envBoolean } from '~/utils/env';
import { DataSource, DataSourceOptions } from 'typeorm';

const dotenv = require('dotenv');

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export const dbConfigKey = 'database';

const dataSourceOptions: DataSourceOptions = {
  type: 'mongodb',
  url: env('MONGODB_URI'),
  username: env('DB_USERNAME'),
  password: env('DB_PASSWORD'),
  logging: envBoolean('DB_LOGGING'),
  synchronize: envBoolean('DB_SYNCHRON', true),
  entities: [
    'dist/src/modules/system/**/entities/*.entity{.ts,.js}',
    'dist/src/modules/**/entities/*.entity{.ts,.js}',
  ],
  migrations: ['dist/src/migrations/*{.ts,.js}'],
  subscribers: ['dist/src/modules/system/**/*.subscriber{.ts,.js}'],
};

// Khởi tạo và đặt tên định danh (registerAs) cho Database configuration object
export const DatabaseConfig = registerAs(
  dbConfigKey,
  (): DataSourceOptions => dataSourceOptions,
);

const dataSource = new DataSource(dataSourceOptions);

export type IDatabaseConfig = ConfigType<typeof DatabaseConfig>;

export default dataSource;
