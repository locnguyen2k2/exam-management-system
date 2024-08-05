import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AuthTypes, PUBLIC_KEY, TokenEnum } from '~/modules/auth/auth.constant';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import { GqlExecutionContext } from '@nestjs/graphql';
import { TokenService } from '~/modules/auth/services/token.service';
import { ExtractJwt } from 'passport-jwt';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import * as _ from 'lodash';

@Injectable()
export class JwtAuthGuard extends AuthGuard(AuthTypes.JWT) {
  jwtFromRequestFn = ExtractJwt.fromAuthHeaderAsBearerToken();

  constructor(
    private reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Chuyển đổi Graphql Execution Context
    const ctx = GqlExecutionContext.create(context);
    // Lấy request từ context
    const request = ctx.getContext().req;
    // Lấy token từ request
    const token = this.jwtFromRequestFn(request);

    request.accessToken = token;

    let result: any = false;

    try {
      result = await super.canActivate(new ExecutionContextHost([request]));
    } catch (e) {
      // Thông qua với Public Guard
      if (isPublic) return true;

      if (_.isNil(token))
        throw new BusinessException(ErrorEnum.TOKEN_IS_REQUIRED);

      if (e instanceof UnauthorizedException)
        throw new BusinessException(ErrorEnum.INVALID_TOKEN);

      // Kiểm tra token
      if (
        !(await this.tokenService.checkToken({
          token,
          type: TokenEnum.ACCESS_TOKEN,
        }))
      )
        throw new BusinessException(ErrorEnum.INVALID_TOKEN);
    }
    return result;
  }
}
