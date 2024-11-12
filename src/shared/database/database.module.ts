import { Module } from '@nestjs/common';
import { DatabaseConfig } from '~/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync(DatabaseConfig.asProvider()),
    // TypeOrmModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService<ConfigKeyPaths>) => {
    //     return {
    //       ...configService.get<IDatabaseConfig>('database'),
    //       cli: {
    //         migrationsDir: 'src/migration',
    //       },
    //     };
    //   },
    // }),
  ],
})
export class DatabaseModule {}
