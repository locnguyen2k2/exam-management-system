import { MailerService } from './mailer.service';
import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { MailerConfig } from '~/config';

// const path = require('path');

@Module({
  imports: [
    NestMailerModule.forRootAsync(MailerConfig.asProvider()),
    // NestMailerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService<ConfigKeyPaths>) => ({
    //     transport: configService.get<IMailerConfig>('mailer'),
    //     template: {
    //       dir: path.join(cwd, 'dist/public/templates/mailers'),
    //       adapter: new HandlebarsAdapter(),
    //       options: { strict: true },
    //     },
    //   }),
    // }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
