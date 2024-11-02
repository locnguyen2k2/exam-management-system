import { ObjectType } from '@nestjs/graphql';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('PermissionPagination')
export class PermissionPaginationDto extends createPaginatedType(
  PermissionEntity,
) {}
