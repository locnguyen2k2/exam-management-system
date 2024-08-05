import { ConfigType, registerAs } from '@nestjs/config';

import { env, envBoolean, envNumber } from '~/utils/env';

export const appKey = 'app';

export const AppConfig = registerAs(appKey, () => ({
  name: env('NEST_APP_NAME'),
  port: envNumber('NEST_APP_PORT', 3000),
  baseUrl: env('NEST_APP_BASE_URL'),
  globalPrefix: env('GLOBAL_PREFIX', 'api'),
  multiDeviceLogin: envBoolean('MULTI_DEVICE_LOGIN', true),

  logger: {
    level: env('LOGGER_LEVEL'),
    maxFiles: envNumber('LOGGER_MAX_FILES'),
  },
}));

export type IAppConfig = ConfigType<typeof AppConfig>;
