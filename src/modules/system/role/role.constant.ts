import { registerEnumType } from '@nestjs/graphql';

enum RoleEnum {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  TEACHER = 'teacher',
}

export { RoleEnum };

registerEnumType(RoleEnum, { name: 'RoleEnum' });
