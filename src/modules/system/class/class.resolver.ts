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
import { plainToClass } from 'class-transformer';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';

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
  ): Promise<PageDto<ClassEntity>> {
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
    @Args('createClassArgs') dto: CreateClassDto,
  ): Promise<ClassEntity> {
    const data = CreateClassDto.plainToClass(dto);
    data.createBy = user.id;
    return await this.classServicee.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_CLASS)
  @Mutation(() => ClassEntity, {
    name: 'updateClass',
    description: 'Cập nhật lớp',
  })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('classId', { type: () => String! }) id: string,
    @Args('updateClassArgs') dto: UpdateClassDto,
  ): Promise<ClassEntity> {
    const data = plainToClass(UpdateClassDto, dto);
    data.updateBy = user.id;
    return await this.classServicee.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_CLASS)
  @Mutation(() => String, { name: 'deleteClasses' })
  async deleteClasses(
    @CurrentUser() user: IAuthPayload,
    @Args('classIds', { type: () => [String] }) classIds: string[],
  ): Promise<string> {
    return await this.classServicee.deleteMany(classIds, user.id);
  }
}
