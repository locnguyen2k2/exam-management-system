import { Global, Module } from '@nestjs/common';
import { MailerModule } from '~/config/mailer/mailer.module';
import { GraphQLModule } from '~/config/graphql/graphql.module';
import { DatabaseModule } from '~/config/database/database.module';

const modules = [GraphQLModule, DatabaseModule, MailerModule];

@Global()
@Module({
  imports: [...modules],
  exports: [...modules],
})
export class SharedModule {}
