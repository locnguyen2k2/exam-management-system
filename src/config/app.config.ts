import { ConfigType, registerAs } from '@nestjs/config';

import { env, envBoolean, envNumber } from '~/utils/env';

export const appConfigKey = 'app';

export const AppConfig = registerAs(appConfigKey, () => ({
  name: env('NEST_APP_NAME', 'EMS-Admin'),
  port: envNumber('NEST_APP_PORT', 3000),
  baseUrl: env('NEST_APP_BASE_URL'),
  globalPrefix: env('GLOBAL_PREFIX', 'api'),
  multiDeviceLogin: envBoolean('MULTI_DEVICE_LOGIN', true),

  logger: {
    level: env('LOGGER_LEVEL', 'verbose'),
    maxFiles: envNumber('LOGGER_MAX_FILES', 31),
  },
}));

export type IAppConfig = ConfigType<typeof AppConfig>;
