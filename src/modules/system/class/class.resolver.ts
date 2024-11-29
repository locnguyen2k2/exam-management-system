import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClassService } from '~/modules/system/class/class.service';
import { Permissions } from '~/common/decorators/permission.decorator';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { RoleEnum } from '~/modules/system/role/role.constant';
import {
  ClassPageOptions,
  CreateClassDto,
  UpdateClassDto,
} from '~/modules/system/class/dtos/class-req.dto';
import { ClassPaginationDto } from '~/modules/system/class/dtos/class-res.dto';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';
import { IdParam } from '~/common/decorators/id.decorator';

@Resolver('Class Resolver')
export class ClassResolver {
  constructor(private readonly classServicee: ClassService) {}

  @Permissions(PermissionEnum.LIST_CLASS)
  @Query(() => ClassPaginationDto, {
    name: 'classes',
    description: 'Lấy danh sách lớp',
  })
  async classes(
    @CurrentUser() user: IAuthPayload,
    @Args('classPageOptions', { nullable: true })
    classPageOptions: ClassPageOptions = new ClassPageOptions(),
  ) {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return this.classServicee.findAll(
      isAdmin ? null : user.id,
      classPageOptions,
    );
  }

  @Permissions(PermissionEnum.ADD_CLASS)
  @Mutation(() => ClassEntity, {
    name: 'createClass',
    description: 'Tạo lớp',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createClassArgs') args: CreateClassDto,
  ): Promise<ClassEntity> {
    args.createBy = user.id;
    return await this.classServicee.create(args);
  }

  @Permissions(PermissionEnum.DETAIL_CLASS)
  @Mutation(() => ClassEntity, {
    name: 'classDetail',
    description: 'Chi tiết lớp học',
  })
  async detail(
    @Args('id') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
  ): Promise<ClassEntity> {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return await this.classServicee.findAvailable(id, isAdmin ? null : user.id);
  }

  @Permissions(PermissionEnum.UPDATE_CLASS)
  @Mutation(() => ClassEntity, {
    name: 'updateClass',
    description: 'Cập nhật lớp',
  })
  async update(
    @Args('classId') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
    @Args('updateClassArgs') args: UpdateClassDto,
  ) {
    args.updateBy = user.id;
    return await this.classServicee.update(id, args);
  }

  @Permissions(PermissionEnum.DELETE_CLASS)
  @Mutation(() => String, { name: 'deleteClasses' })
  async deleteClasses(
    @Args('classIds', { type: () => [String] }) @IdParam() classIds: string[],
    @CurrentUser() user: IAuthPayload,
  ) {
    return await this.classServicee.deleteMany(classIds, user.id);
  }
}
