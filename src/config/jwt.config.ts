import { ConfigType, registerAs } from '@nestjs/config';

import { env, envNumber } from '~/utils/env';

export const jwtConfigKey = 'jwt';

// Khởi tạo và đặt tên (registerAs) cho Jwt configuration object
export const JwtConfig = registerAs(jwtConfigKey, () => ({
  global: true,
  secret: env('JWT_SECRET'),
  signOptions: {
    expiresIn: `${envNumber('JWT_EXPIRE')}s`,
  },
  ignoreExpiration: false,
}));

export type IJwtConfig = ConfigType<typeof JwtConfig>;
