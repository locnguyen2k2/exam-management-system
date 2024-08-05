import { Injectable } from '@nestjs/common';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { ConfigKeyPaths, IGraphqlConfig } from '~/config';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLError } from 'graphql/error';
import { GraphQLSchema } from 'graphql/type';
import { cwd } from '~/utils/env';

const configService = new ConfigService<ConfigKeyPaths>();

@Injectable()
export class GraphqlOptions implements GqlOptionsFactory {
  public base_schema: GraphQLSchema = null;

  public createGqlOptions(): Promise<ApolloDriverConfig> | ApolloDriverConfig {
    return {
      ...configService.get<IGraphqlConfig>('graphql'),
      autoSchemaFile: `${cwd}/src/schema.graphql`,
      context: ({ req, res, connection }) =>
        connection
          ? { req: { headers: connection.context }, res }
          : { req, res },
      formatError: (error: GraphQLError) => {
        error.message = error.extensions.originalError
          ? error.extensions.originalError['message']
          : error.message;
        return { message: error.message, locations: error.locations };
      },
    };
  }
}
