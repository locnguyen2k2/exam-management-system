import { ConfigType, registerAs } from '@nestjs/config';

import { env, envNumber } from '~/utils/env';

export const appConfigKey = 'app';

export const AppConfig = registerAs(appConfigKey, () => ({
  name: env('NEST_APP_NAME', 'EMS-Admin'),
  port: envNumber('NEST_APP_PORT', 3000),
  baseUrl: env('NEST_APP_BASE_URL'),
}));

export type IAppConfig = ConfigType<typeof AppConfig>;
