import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LessonService } from '~/modules/system/lesson/lesson.service';
import {
  CreateLessonDto,
  EnableLessonsDto,
  LessonPageOptions,
  UpdateLessonDto,
} from '~/modules/system/lesson/dtos/lesson-req.dto';
import { plainToClass } from 'class-transformer';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { Permissions } from '~/common/decorators/permission.decorator';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import {
  LessonDetailDto,
  LessonPaginationDto,
} from '~/modules/system/lesson/dtos/lesson-res.dto';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';

@Resolver('Lessons')
export class LessonResolver {
  constructor(private readonly lessonService: LessonService) {}

  @Permissions(PermissionEnum.LIST_LESSON)
  @Query(() => LessonPaginationDto, {
    name: 'lessons',
    description: 'Danh sách học phân',
  })
  async lessons(
    @CurrentUser() user: IAuthPayload,
    @Args('lessonPageOptions')
    pageOptions: LessonPageOptions = new LessonPageOptions(),
  ): Promise<PageDto<LessonDetailDto>> {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return await this.lessonService.findAll(
      isAdmin ? null : user.id,
      pageOptions,
    );
  }

  @Permissions(PermissionEnum.DETAIL_LESSON)
  @Query(() => LessonDetailDto, {
    name: 'lesson',
    description: 'Chi tiết học phần',
  })
  async lesson(
    @Args('lessonId') id: string,
    @CurrentUser() user: IAuthPayload,
  ): Promise<LessonDetailDto> {
    return await this.lessonService.detailLesson(id, user.id);
  }

  @Permissions(PermissionEnum.ADD_LESSON)
  @Mutation(() => [LessonEntity], { name: 'createLessons' })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createLessonArgs') dto: CreateLessonDto,
  ): Promise<LessonEntity[]> {
    const data = plainToClass(CreateLessonDto, dto);
    data.createBy = user.id;
    return await this.lessonService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_LESSON)
  @Mutation(() => LessonDetailDto, {
    name: 'updateLesson',
    description: 'Cập nhật học phân',
  })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('id') id: string,
    @Args('updateLessonArgs') dto: UpdateLessonDto,
  ): Promise<LessonDetailDto> {
    const data = plainToClass(UpdateLessonDto, dto);
    data.updateBy = user.id;
    return await this.lessonService.update(id, data);
  }

  @Permissions(PermissionEnum.UPDATE_LESSON)
  @Mutation(() => [LessonEntity], {
    name: 'enableLessons',
    description: 'Kích hoạt học phần',
  })
  async enable(
    @CurrentUser() user: IAuthPayload,
    @Args('enableLessonsArgs') dto: EnableLessonsDto,
  ): Promise<LessonEntity[]> {
    const data = plainToClass(EnableLessonsDto, dto);
    data.updateBy = user.id;
    return await this.lessonService.enableLessons(data);
  }

  @Permissions(PermissionEnum.DELETE_LESSON)
  @Mutation(() => String, {
    name: 'deleteLessons',
    description: 'Xóa học phần',
  })
  async delete(
    @CurrentUser() user: IAuthPayload,
    @Args('lessonIds', { type: () => [String] }) lessonIds: string[],
  ): Promise<string> {
    return await this.lessonService.deleteMany(lessonIds, user.id);
  }
}
