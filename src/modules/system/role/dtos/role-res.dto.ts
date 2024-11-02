import { ObjectType } from '@nestjs/graphql';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('RolePagination')
export class RolePagination extends createPaginatedType(RoleEntity) {}
