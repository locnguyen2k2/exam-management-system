import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { JwtConfig } from '~/config';
import { PassportModule } from '@nestjs/passport';

@Global()
@Module({
  imports: [
    NestJwtModule.registerAsync({ ...JwtConfig.asProvider(), global: true }),
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
    }),
  ],
})
export class JwtModule {}
