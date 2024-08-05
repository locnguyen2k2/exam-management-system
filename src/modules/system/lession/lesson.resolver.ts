import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LessonService } from '~/modules/system/lession/lesson.service';
import {
  CreateLessonDto,
  LessonPageOptions,
  UpdateLessonDto,
} from '~/modules/system/lession/dtos/lesson-req.dto';
import { plainToClass } from 'class-transformer';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { Permissions } from '~/common/decorators/permission.decorator';
import { LessonEntity } from '~/modules/system/lession/entities/lesson.entity';
import { LessonPaginationDto } from '~/modules/system/lession/dtos/lesson-res.dto';

@Resolver('Lessons')
export class LessonResolver {
  constructor(private readonly lessonService: LessonService) {}

  @Permissions(PermissionEnum.LIST_LESSON)
  @Mutation(() => LessonPaginationDto, { name: 'lessons' })
  async lessons(
    @Args('lessonPageOptions')
    pageOptions: LessonPageOptions = new LessonPageOptions(),
  ): Promise<LessonPaginationDto> {
    return await this.lessonService.findAll(pageOptions);
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
  @Mutation(() => LessonEntity, { name: 'updateLesson' })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('id') id: string,
    @Args('updateLessonArgs') dto: UpdateLessonDto,
  ): Promise<LessonEntity> {
    const data = plainToClass(UpdateLessonDto, dto);
    data.updateBy = user.id;
    return await this.lessonService.update(id, data);
  }
}
