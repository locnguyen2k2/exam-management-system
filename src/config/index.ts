import {
  DatabaseConfig,
  databaseKey,
  IDatabaseConfig,
} from '~/config/database/database.config';
import { AppConfig, appKey, IAppConfig } from '~/config/app/app.config';
import {
  GraphqlConfig,
  graphqlKey,
  IGraphqlConfig,
} from '~/config/graphql/graphql.config';
import {
  IMailerConfig,
  MailerConfig,
  mailerKey,
} from '~/config/mailer/mailer.config';
import { IJwtConfig, JwtConfig, jwtKey } from '~/config/jwt/jwt.config';
// import {
//   FirebaseConfig,
//   firebaseKey,
//   IFirebaseConfig,
// } from '~/config/firebase/firebase.config';

export * from '~/config/app/app.config';
export * from '~/config/database/database.config';
export * from '~/config/graphql/graphql.config';
export * from '~/config/mailer/mailer.config';
export * from '~/config/jwt/jwt.config';

// export * from '~/config/firebase/firebase.config';

export interface AllConfigType {
  [appKey]: IAppConfig;
  [databaseKey]: IDatabaseConfig;
  [graphqlKey]: IGraphqlConfig;
  [mailerKey]: IMailerConfig;
  [jwtKey]: IJwtConfig;
  // [firebaseKey]: IFirebaseConfig;
}

export type ConfigKeyPaths = RecordNamePaths<AllConfigType>;

export default {
  AppConfig,
  DatabaseConfig,
  GraphqlConfig,
  MailerConfig,
  JwtConfig,
  // FirebaseConfig,
};
