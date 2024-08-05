import { applyDecorators, SetMetadata } from '@nestjs/common';
import { PUBLIC_KEY, PERMISSION_KEYS } from '~/modules/auth/auth.constant';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';

export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const Permissions = (...pers: PermissionEnum[]) =>
  applyDecorators(SetMetadata(PERMISSION_KEYS, pers));
