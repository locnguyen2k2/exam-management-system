import { Inject, Injectable } from '@nestjs/common';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { GraphqlConfig, IGraphqlConfig } from '~/config';
import { ApolloDriverConfig } from '@nestjs/apollo';

@Injectable()
export class GraphqlOptions implements GqlOptionsFactory {
  constructor(
    @Inject(GraphqlConfig.KEY) private graphqlConfig: IGraphqlConfig,
  ) {}

  public createGqlOptions(): Promise<ApolloDriverConfig> | ApolloDriverConfig {
    return this.graphqlConfig;
  }
}
