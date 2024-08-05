import { ConfigType, registerAs } from '@nestjs/config';

import { env } from '~/utils/env';

export const mailerKey = 'mailer';

export const MailerConfig = registerAs(mailerKey, () => ({
  service: env('MAILER_SERVICE'),
  auth: {
    user: env('MAILER_USER'),
    pass: env('MAILER_PASSWORD'),
  },
}));

export type IMailerConfig = ConfigType<typeof MailerConfig>;
