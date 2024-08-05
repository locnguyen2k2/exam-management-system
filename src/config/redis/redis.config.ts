import { ConfigType, registerAs } from '@nestjs/config';
import { env, envNumber } from '~/utils/env';

export const redisKey = 'redis';

export const RedisConfig = registerAs(redisKey, () => ({
  host: env('REDIS_HOST', '127.0.0.1'),
  port: envNumber('REDIS_PORT', 6379),
  password: env('REDIS_PASSWORD'),
}));

export type IRedisConfig = ConfigType<typeof RedisConfig>;
