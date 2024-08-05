import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKeyPaths, IDatabaseConfig } from '~/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigKeyPaths>) => {
        return {
          ...configService.get<IDatabaseConfig>('database'),
          cli: {
            migrationsDir: 'src/migration',
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
