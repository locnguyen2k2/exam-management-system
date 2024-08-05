import { ConfigType, registerAs } from '@nestjs/config';

import { env, envNumber } from '~/utils/env';

export const jwtKey = 'jwt';

export const JwtConfig = registerAs(jwtKey, () => ({
  jwtSecret: env('JWT_SECRET'),
  jwtExprire: envNumber('JWT_EXPIRE'),
  refreshSecret: env('REFRESH_TOKEN_SECRET'),
  refreshExpire: envNumber('REFRESH_TOKEN_EXPIRE'),
}));

export type IJwtConfig = ConfigType<typeof JwtConfig>;
