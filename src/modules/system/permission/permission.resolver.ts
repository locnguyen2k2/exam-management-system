import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { PermissionService } from '~/modules/system/permission/permission.service';
import { PermissionPaginationDto } from '~/modules/system/permission/dtos/permission-res.dto';
import {
  CreatePermissionDto,
  PermissionPageOptions,
  UpdatePermissionDto,
} from '~/modules/system/permission/dtos/permission-req.dto';
import { Permissions } from '~/common/decorators/permission.decorator';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { plainToClass } from 'class-transformer';

@Resolver('Permissions')
export class PermissionResolver {
  constructor(private readonly permissionService: PermissionService) {}

  @Permissions(PermissionEnum.LIST_PERMISSION)
  @Query(() => PermissionPaginationDto, {
    name: 'permissions',
    description: 'Lấy danh sách phân quyên',
  })
  async permissions(
    @Args('perPageOptions', {
      description: 'Bộ lọc danh sách phân quyền',
      nullable: true,
    })
    perPageOptions: PermissionPageOptions = new PermissionPageOptions(),
  ) {
    return await this.permissionService.findAll(perPageOptions);
  }

  @Permissions(PermissionEnum.ADD_PERMISSION)
  @Mutation(() => PermissionEntity, {
    name: 'createPermission',
    description: 'Tạo phân quyền',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createPermissionArgs') args: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    args.createBy = user?.id ? user.id : null;
    const data = CreatePermissionDto.plainToClass(args);
    return await this.permissionService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_PERMISSION)
  @Mutation(() => PermissionEntity, {
    name: 'updatePermission',
    description: 'Cập nhật phân quyền',
  })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('id') id: string,
    @Args('updatePermissionArgs') args: UpdatePermissionDto,
  ): Promise<any> {
    args.updateBy = user?.id ? user.id : null;
    const data = plainToClass(UpdatePermissionDto, args);
    return await this.permissionService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_PERMISSION)
  @Mutation(() => String, {
    name: 'deletePermissions',
    description: 'Xóa danh sách phân quyền',
  })
  async deletePermissions(
    @Args('permissionIds', { type: () => [String] }) perIds: string[],
  ): Promise<string> {
    return await this.permissionService.deleteMany(perIds);
  }
}
