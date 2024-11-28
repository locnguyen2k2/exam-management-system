import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigKeyPaths } from '~/config';
import { useContainer } from 'class-validator';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';
import { envNumber } from '~/utils/env';

declare const module: any;

async function bootstrap() {
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

  await app.listen(port, '0.0.0.0', async () => {
    const prefix = 'W';
    const { pid } = process;
    const url = await app.getUrl();
    console.log(`[${prefix + pid}] Server running on ${url}`);
  });

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
