import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { UserService } from '~/modules/system/user/user.service';
import { Permissions } from '~/common/decorators/permission.decorator';
import {
  AdminCreateDto,
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
import { plainToClass } from 'class-transformer';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';

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
  ): Promise<PageDto<UserEntity>> {
    return await this.userService.findAll(userPagination);
  }

  @Permissions(PermissionEnum.DETAIL_USER)
  @Query(() => UserProfile, {
    name: 'userDetail',
    description: 'Chi tiết người dùng',
  })
  async detail(@Args('id') id: string): Promise<UserProfile> {
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
  ): Promise<UserEntity> {
    args.createBy = user?.id ? user.id : null;
    const data = AdminCreateDto.plainToClass(args);
    return await this.userService.create({ ...data, createBy: null });
  }

  @Permissions(PermissionEnum.UPDATE_USER)
  @Mutation(() => UserProfile, {
    name: 'updateUser',
    description: 'Cập nhật người dùng',
  })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('userId', { type: () => String! }) userId: string,
    @Args('updateUserArgs') args: UpdateUserDto,
  ): Promise<UserProfile> {
    args.updateBy = user?.id ? user.id : null;
    const data = plainToClass(UpdateUserDto, args);
    return await this.userService.update(userId, data);
  }

  @Permissions(PermissionEnum.DELETE_USER)
  @Mutation(() => String, { name: 'deleteUser', description: 'Xóa người dùng' })
  async delete(
    @Args('userId', { type: () => String }) uid: string,
  ): Promise<string> {
    return await this.userService.deleteUser(uid);
  }
}
