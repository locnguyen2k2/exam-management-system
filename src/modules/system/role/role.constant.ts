import { registerEnumType } from '@nestjs/graphql';

const countPerIds = 50;

enum RoleEnum {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

export { countPerIds, RoleEnum };

registerEnumType(RoleEnum, { name: 'RoleEnum' });
