import { Global, Module } from '@nestjs/common';
import { MailerModule } from '~/shared/mailer/mailer.module';
import { GraphQLModule } from '~/shared/graphql/graphql.module';
import { DatabaseModule } from '~/shared/database/database.module';
import { RedisModule } from '~/shared/redis/redis.module';
// import { LoggerModule } from '~/shared/logger/logger.module';

const modules = [
  GraphQLModule,
  RedisModule,
  // LoggerModule.forRoot(),
  DatabaseModule,
  MailerModule,
];

@Global()
@Module({
  imports: [...modules],
  exports: [...modules],
})
export class SharedModule {}
