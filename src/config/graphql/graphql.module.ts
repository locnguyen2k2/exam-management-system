import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphqlOptions } from '~/config/graphql/graphq.options';

@Module({
  imports: [
    NestGraphQLModule.forRootAsync({
      useClass: GraphqlOptions,
      driver: ApolloDriver,
    }),
  ],
})
export class GraphQLModule {}
