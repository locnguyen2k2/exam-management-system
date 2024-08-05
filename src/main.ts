import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigKeyPaths } from '~/config';
import { useContainer } from 'class-validator';
import { INestApplication, ValidationPipe } from '@nestjs/common';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<INestApplication>(AppModule);
  const configService = app.get(ConfigService<ConfigKeyPaths>);
  const { port, globalPrefix } = configService.get('app', { infer: true });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({ origin: '*', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(port, '0.0.0.0', async () => {
    const url = await app.getUrl();
    const { pid } = process;
    const prefix = 'W';
    console.log(`[${prefix + pid}] Server running on ${url}`);
  });

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
