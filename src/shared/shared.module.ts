import { Global, Module } from '@nestjs/common';
import { MailerModule } from '~/shared/mailer/mailer.module';
import { GraphQLModule } from '~/shared/graphql/graphql.module';
import { DatabaseModule } from '~/shared/database/database.module';

const modules = [GraphQLModule, DatabaseModule, MailerModule];

@Global()
@Module({
  imports: [...modules],
  exports: [...modules],
})
export class SharedModule {}
