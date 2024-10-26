import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  PERMISSION_KEYS,
  PUBLIC_KEY,
  TokenEnum,
} from '~/modules/auth/auth.constant';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { UserService } from '~/modules/system/user/user.service';
import { TokenService } from '~/modules/auth/services/token.service';

@Injectable()
export class PermissionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Thông qua nếu là Public Guard
    if (isPublic) return true;
    // Chuyển đổi Graphql Execution Context
    const ctx = GqlExecutionContext.create(context);
    // Lấy request từ context
    const req = ctx.getContext().req;
    // Lấy thuộc tính user từ request (PassportModule configurations)
    const { user } = req;

    if (!user) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    // Kiểm tra token
    const checkAT = await this.tokenService.checkToken({
      token: req.accessToken,
      type: TokenEnum.ACCESS_TOKEN,
    });
    const isUserAT = await this.userService.userHasToken(
      user.id,
      req.accessToken,
      TokenEnum.ACCESS_TOKEN,
    );

    if (!checkAT) throw new BusinessException(ErrorEnum.INVALID_TOKEN);
    if (!isUserAT) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    const requirePerVals = this.reflector.getAllAndOverride<string | string[]>(
      PERMISSION_KEYS,
      [context.getHandler(), context.getClass()],
    );
    // Check user available
    if (!user.status || !user.enable)
      throw new BusinessException(ErrorEnum.USER_UNAVAILABLE);

    // Kiểm tra nếu PermissionGuard không có yêu cu quyền truy cập
    if (!requirePerVals) return true;
    const isUser = await this.userService.findOne(user.id);
    const roles = this.userService.getUserPermissions(isUser);
    // Thông qua với user có quyền quản trị
    if (
      roles.some(
        (role: any) =>
          RoleEnum[`${role.value.toUpperCase()}`] === RoleEnum.ADMIN,
      )
    )
      return true;
    // Lấy danh sách phân quyền của người dùng vơi id
    const userPers = roles.map((role: any) => role.permissions).flat();
    let allowAccess = false;
    // Nếu PermissionGuard yêu cầu một danh sách phân quyền
    if (Array.isArray(requirePerVals)) {
      allowAccess = requirePerVals.every((perValue) =>
        userPers.includes(perValue),
      );
    }

    if (typeof requirePerVals === 'string') {
      allowAccess = userPers.includes(requirePerVals);
    }

    if (!allowAccess) throw new BusinessException(ErrorEnum.ACCESS_DENIED);

    return true;
  }
}
