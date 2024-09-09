import { MailerService } from './mailer.service';
import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigKeyPaths } from '~/config';
import { IMailerConfig } from '~/config/mailer/mailer.config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { cwd } from '~/utils/env';

const path = require('path');

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigKeyPaths>) => ({
        transport: configService.get<IMailerConfig>('mailer'),
        template: {
          dir: path.join(cwd, 'dist/public/templates/mailers'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
