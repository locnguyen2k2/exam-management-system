import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import { RoleService } from '~/modules/system/role/role.service';
import { RolePagination } from '~/modules/system/role/dtos/role-res.dto';
import {
  RoleCreateDto,
  RolePageOptions,
  UpdateRoleDto,
} from '~/modules/system/role/dtos/role-req.dto';
import { Permissions } from '~/common/decorators/permission.decorator';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { plainToClass } from 'class-transformer';

@Resolver('Roles')
export class RoleResolver {
  constructor(private readonly roleService: RoleService) {}

  @Permissions(PermissionEnum.LIST_ROLE)
  @Query(() => RolePagination, {
    name: 'roles',
    description: 'Lấy danh sách quyền',
  })
  async roles(
    @Args('rolePageOptions', { nullable: true })
    rolePageOptions: RolePageOptions = new RolePageOptions(),
  ): Promise<RolePagination> {
    return this.roleService.findAll(rolePageOptions);
  }

  @Permissions(PermissionEnum.ADD_ROLE)
  @Mutation(() => RoleEntity, { name: 'createRole' })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createRoleArgs') args: RoleCreateDto,
  ): Promise<RoleEntity> {
    args.createBy = user?.id ? user.id : null;
    const data = RoleCreateDto.plainToClass(args);
    return await this.roleService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_ROLE)
  @Mutation(() => RoleEntity, {
    name: 'updateRole',
    description: 'Cập nhật quền',
  })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('id') id: string,
    @Args('updateRoleArgs') args: UpdateRoleDto,
  ): Promise<RoleEntity> {
    args.updateBy = user.id ? user.id : null;
    const data = plainToClass(UpdateRoleDto, args);
    return await this.roleService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_ROLE)
  @Mutation(() => String, { name: 'deleteRoles' })
  async deleteRoles(
    @Args('roleIds', { type: () => [String] }) roleIds: string[],
  ): Promise<string> {
    return await this.roleService.deleteMany(roleIds);
  }
}
