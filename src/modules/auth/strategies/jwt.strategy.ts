import { Inject, Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { AuthTypes } from '~/modules/auth/auth.constant';
import { IJwtConfig, JwtConfig } from '~/config';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AuthTypes.JWT) {
  constructor(@Inject(JwtConfig.KEY) private readonly jwtConfig: IJwtConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfig.jwtSecret,
      ignoreExpiration: true,
    });
  }

  async validate(payload: IAuthPayload) {
    return payload;
  }
}
