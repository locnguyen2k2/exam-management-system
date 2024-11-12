import { ConfigType, registerAs } from '@nestjs/config';
import { cwd, envBoolean } from '~/utils/env';

export const gplConfigKey = 'graphql';

// Khởi tạo và đặt tên (registerAs) cho Graphql configuration object
export const GraphqlConfig = registerAs(gplConfigKey, () => ({
  debug: envBoolean('GQL_DEBUG'),
  playground: envBoolean('GQL_PLAYGROUND'),
  autoSchemaFile: `${cwd}/src/schema.graphql`,
  introspection: envBoolean('GQL_INTROSPECTION'),
  installSubscriptionHandlers: envBoolean('GQL_INSTALL_SUBSCRIPTION_HANDLERS'),
  context: ({ req, res, connection }) =>
    connection ? { req: { headers: connection.context }, res } : { req, res },
  formatError: (error: any) => {
    error.message = error.extensions.originalError
      ? error.extensions.originalError['message']
      : error.message;
    return { message: error.message, locations: error.locations };
  },
}));

export type IGraphqlConfig = ConfigType<typeof GraphqlConfig>;
