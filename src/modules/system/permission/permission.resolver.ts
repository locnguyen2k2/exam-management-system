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
import { IdParam } from '~/common/decorators/id.decorator';

@Resolver('Permissions')
export class PermissionResolver {
  constructor(private readonly permissionService: PermissionService) {}

  @Permissions(PermissionEnum.LIST_PERMISSION)
  @Query(() => PermissionPaginationDto, {
    name: 'permissions',
    description: 'Lấy danh sách phân quyên',
  })
  async permissions(
    @Args('permissionPageOptions', {
      description: 'Bộ lọc danh sách phân quyền',
      nullable: true,
    })
    permissionPageOptions: PermissionPageOptions = new PermissionPageOptions(),
  ) {
    return await this.permissionService.findAll(permissionPageOptions);
  }

  @Permissions(PermissionEnum.ADD_PERMISSION)
  @Mutation(() => PermissionEntity, {
    name: 'createPermission',
    description: 'Tạo phân quyền',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createPermissionArgs') args: CreatePermissionDto,
  ) {
    args.createBy = user.id;
    return await this.permissionService.create(args);
  }

  @Permissions(PermissionEnum.UPDATE_PERMISSION)
  @Mutation(() => PermissionEntity, {
    name: 'updatePermission',
    description: 'Cập nhật phân quyền',
  })
  async update(
    @Args('id') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
    @Args('updatePermissionArgs') args: UpdatePermissionDto,
  ) {
    args.updateBy = user.id;
    return await this.permissionService.update(id, args);
  }

  @Permissions(PermissionEnum.DELETE_PERMISSION)
  @Mutation(() => String, {
    name: 'deletePermissions',
    description: 'Xóa danh sách phân quyền',
  })
  async deletePermissions(
    @Args('permissionIds', { type: () => [String] })
    @IdParam()
    perIds: string[],
  ) {
    return await this.permissionService.deleteMany(perIds);
  }
}
