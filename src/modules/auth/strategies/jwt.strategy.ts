import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { AuthTypes } from '~/modules/auth/auth.constant';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { ConfigService } from '@nestjs/config';
import { IJwtConfig } from '~/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AuthTypes.JWT) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<IJwtConfig>('jwt').secret,
      ignoreExpiration: true,
    });
  }

  async validate(payload: IAuthPayload) {
    return payload;
  }
}
