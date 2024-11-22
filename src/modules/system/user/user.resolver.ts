import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { UserService } from '~/modules/system/user/user.service';
import { Permissions } from '~/common/decorators/permission.decorator';
import {
  AdminCreateDto,
  ChangePasswordDto,
  UpdateUserDto,
  UserPageOptions,
} from '~/modules/system/user/dtos/user-req.dto';
import {
  UserPagination,
  UserProfile,
} from '~/modules/system/user/dtos/user-res.dto';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { IdParam } from '~/common/decorators/id.decorator';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Permissions(PermissionEnum.LIST_USER)
  @Query(() => UserPagination, {
    name: 'users',
    description: 'Lấy danh sách người dùng',
  })
  async users(
    @Args('userPageOptions', { nullable: true })
    userPagination: UserPageOptions = new UserPageOptions(),
  ) {
    return await this.userService.findAll(userPagination);
  }

  @Permissions(PermissionEnum.UPDATE_ACCOUNT)
  @Mutation(() => String, {
    name: 'changePassword',
    description: 'Đổi mật khẩu',
  })
  async changePassword(
    @Args('ChangePasswordArgs') args: ChangePasswordDto,
    @CurrentUser() user: IAuthPayload,
  ) {
    args.updateBy = user.id;
    return await this.userService.changePassword(args);
  }

  @Permissions(PermissionEnum.DETAIL_USER)
  @Query(() => UserProfile, {
    name: 'userDetail',
    description: 'Chi tiết người dùng',
  })
  async detail(@Args('id') @IdParam() id: string) {
    return await this.userService.getProfile(id);
  }

  @Permissions(PermissionEnum.ADD_USER)
  @Mutation(() => UserEntity, {
    name: 'createUser',
    description: 'Khởi tạo người dùng',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('adminCreateArgs') args: AdminCreateDto,
  ) {
    args.createBy = user.id;
    return await this.userService.create(args);
  }

  @Permissions(PermissionEnum.UPDATE_USER)
  @Mutation(() => UserProfile, {
    name: 'updateUser',
    description: 'Cập nhật người dùng',
  })
  async update(
    @Args('userId') @IdParam() userId: string,
    @Args('updateUserArgs') args: UpdateUserDto,
    @CurrentUser() user: IAuthPayload,
  ) {
    args.updateBy = user.id;
    return await this.userService.update(userId, args);
  }

  @Permissions(PermissionEnum.DELETE_USER)
  @Mutation(() => String, { name: 'deleteUser', description: 'Xóa người dùng' })
  async delete(@Args('userId') @IdParam() uid: string) {
    return await this.userService.deleteUser(uid);
  }
}
