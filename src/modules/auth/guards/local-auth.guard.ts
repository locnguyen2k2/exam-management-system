import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthTypes } from '~/modules/auth/auth.constant';

@Injectable()
export class LocalAuthGuard extends AuthGuard(AuthTypes.LOCAL) {
  async canActivate(context: ExecutionContext) {
    return true;
  }
}
