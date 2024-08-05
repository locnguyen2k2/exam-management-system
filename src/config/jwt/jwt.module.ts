import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigKeyPaths, IJwtConfig } from '~/config';
import { PassportModule } from '@nestjs/passport';

@Global()
@Module({
  imports: [
    NestJwtModule.registerAsync({
      global: true, //Make module is global
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ConfigKeyPaths>) => {
        const { jwtSecret, jwtExprire } = configService.get<IJwtConfig>('jwt');
        return {
          global: true,
          secret: jwtSecret,
          signOptions: {
            expiresIn: `${jwtExprire}s`,
          },
          ignoreExpiration: false,
        };
      },
      inject: [ConfigService],
    }),

    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
    }),
  ],
})
export class JwtModule {}
