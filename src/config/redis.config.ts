import { ConfigType, registerAs } from '@nestjs/config';
import { env, envNumber } from '~/utils/env';

export const redisConfigKey = 'redis';

// Khởi tạo và đặt tên (registerAs) cho Redis configuration object
export const RedisConfig = registerAs(redisConfigKey, () => ({
  host: env('REDIS_HOST', '127.0.0.1'),
  port: envNumber('REDIS_PORT', 6379),
  password: env('REDIS_PASSWORD'),
}));

export type IRedisConfig = ConfigType<typeof RedisConfig>;