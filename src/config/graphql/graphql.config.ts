import { ConfigType, registerAs } from '@nestjs/config';

import { envBoolean } from './../../utils/env';

export const graphqlKey = 'graphql';

export const GraphqlConfig = registerAs(graphqlKey, () => ({
  playground: envBoolean('GQL_PLAYGROUND'),
  debug: envBoolean('GQL_DEBUG'),
  introspection: envBoolean('GQL_INTROSPECTION'),
  installSubscriptionHandlers: envBoolean('GQL_INSTALL_SUBSCRIPTION_HANDLERS'),
}));

export type IGraphqlConfig = ConfigType<typeof GraphqlConfig>;
