import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthTypes } from '~/modules/auth/auth.constant';
import { AuthService } from '~/modules/auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, AuthTypes.LOCAL) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }
  async validate(email, password): Promise<any> {
    return { name: email, role: password };
  }
}
