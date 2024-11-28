import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigKeyPaths } from '~/config';
import { useContainer } from 'class-validator';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';
import { envNumber, envString } from '~/utils/env';

declare const module: any;

async function bootstrap() {
  let hostIdx = 1;
  const app = await NestFactory.create<INestApplication>(AppModule);
  const configService = app.get(ConfigService<ConfigKeyPaths>);
  const { port } = configService.get('app', { infer: true });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.enableCors({
    origin: ['https://exam-management-sys.vercel.app', 'http://localhost:7001'],
    credentials: true,
  });
  app.use(
    '/graphql',
    graphqlUploadExpress({
      maxFileSize: envNumber('MAX_FILE_SIZE'),
      maxFiles: envNumber('UPLOAD_MAX_FILES'),
    }),
  );
  // Transform và chuyển đổi các validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const appListen = async () => {
    await app
      .listen(port, envString(`NEST_APP_HOST${hostIdx}`), async () => {
        const prefix = 'W';
        const { pid } = process;
        const url = await app.getUrl();
        console.log(`[${prefix + pid}] Server running on ${url}`);
        hostIdx = 1;
      })
      .catch(async (err) => {
        hostIdx = hostIdx + 1;
        if (hostIdx <= 3) {
          await appListen();
        } else {
          throw Error(err);
        }
      });
  };

  await appListen();

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
