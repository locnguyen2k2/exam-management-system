import {
  DatabaseConfig,
  dbConfigKey,
  IDatabaseConfig,
} from '~/config/database.config';
import { AppConfig, appConfigKey, IAppConfig } from '~/config/app.config';
import {
  gplConfigKey,
  GraphqlConfig,
  IGraphqlConfig,
} from '~/config/graphql.config';
import {
  IMailerConfig,
  MailerConfig,
  mailerConfigKey,
} from '~/config/mailer.config';
import {
  IRedisConfig,
  RedisConfig,
  redisConfigKey,
} from '~/config/redis.config';
import { IJwtConfig, JwtConfig, jwtConfigKey } from '~/config/jwt.config';

export * from '~/config/app.config';
export * from '~/config/database.config';
export * from '~/config/graphql.config';
export * from '~/config/mailer.config';
export * from '~/config/jwt.config';
export * from '~/config/redis.config';

export interface AllConfigType {
  [appConfigKey]: IAppConfig;
  [dbConfigKey]: IDatabaseConfig;
  [gplConfigKey]: IGraphqlConfig;
  [mailerConfigKey]: IMailerConfig;
  [jwtConfigKey]: IJwtConfig;
  [redisConfigKey]: IRedisConfig;
}

export type ConfigKeyPaths = RecordNamePaths<AllConfigType>;

export default {
  AppConfig,
  DatabaseConfig,
  GraphqlConfig,
  MailerConfig,
  JwtConfig,
  RedisConfig,
};
