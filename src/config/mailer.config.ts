import { cwd, env } from '~/utils/env';
import { ConfigType, registerAs } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

const path = require('path');

export const mailerConfigKey = 'mailer';

// Khởi tạo và đặt tên (registerAs) cho Mailer configuration object
export const MailerConfig = registerAs(mailerConfigKey, () => ({
  transport: {
    service: env('MAILER_SERVICE'),
    auth: {
      user: env('MAILER_USER'),
      pass: env('MAILER_PASSWORD'),
    },
  },
  template: {
    dir: path.join(cwd, 'dist/public/templates/mailers'),
    adapter: new HandlebarsAdapter(),
    options: { strict: true },
  },
}));
// export const MailerConfig = registerAs(mailerConfigKey, () => ({
//   service: env('MAILER_SERVICE'),
//   auth: {
//     user: env('MAILER_USER'),
//     pass: env('MAILER_PASSWORD'),
//   },
// }));

export type IMailerConfig = ConfigType<typeof MailerConfig>;
