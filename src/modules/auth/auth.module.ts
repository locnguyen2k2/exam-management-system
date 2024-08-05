import { Module } from '@nestjs/common';
import { AuthResolver } from '~/modules/auth/auth.resolver';
import { AuthService } from '~/modules/auth/auth.service';
import { RoleModule } from '~/modules/system/role/role.module';
import { JwtStrategy } from '~/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '~/modules/auth/strategies/local.strategy';
import { TokenService } from '~/modules/auth/services/token.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from '~/modules/auth/entities/token.entity';
import { UsersModule } from '~/modules/system/user/user.module';
import { JwtModule } from '~/config/jwt/jwt.module';
import { AccountResolver } from '~/modules/auth/resolvers/account.resolver';
import { TokenResolver } from '~/modules/auth/resolvers/token.resolver';

const modules = [RoleModule, UsersModule, JwtModule];
const providers = [
  AuthResolver,
  AuthService,
  TokenResolver,
  TokenService,
  AccountResolver,
];
const strategies = [JwtStrategy, LocalStrategy];

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity]), ...modules],
  providers: [...providers, ...strategies],
  exports: [AuthService, ...providers],
})
export class AuthModule {}
