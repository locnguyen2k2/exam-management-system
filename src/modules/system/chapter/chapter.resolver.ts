import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import {
  ChapterPageOptions,
  CreateChapterDto,
  UpdateChapterDto,
  EnableChaptersDto,
} from '~/modules/system/chapter/dtos/chapter-req.dto';
import { Permissions } from '~/common/decorators/permission.decorator';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { plainToClass } from 'class-transformer';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import {
  ChapterDetailDto,
  ChapterPagination,
} from '~/modules/system/chapter/dtos/chapter-res.dto';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { RoleEnum } from '~/modules/system/role/role.constant';

@Resolver('Chapters')
export class ChapterResolver {
  constructor(private readonly chapterService: ChapterService) {}

  @Permissions(PermissionEnum.LIST_CHAPTER)
  @Query(() => ChapterPagination, {
    name: 'chapters',
    description: 'Lấy danh sách chương',
  })
  async chapters(
    @CurrentUser() user: IAuthPayload,
    @Args('chapterPageOptions', { nullable: true })
    chapterPageOptions: ChapterPageOptions = new ChapterPageOptions(),
  ): Promise<ChapterPagination> {
    return this.chapterService.findAll(user.id, null, chapterPageOptions);
  }

  @Permissions(PermissionEnum.LIST_CHAPTER)
  @Query(() => ChapterPagination, {
    name: 'chaptersByLesson',
    description: 'Lấy danh sách chương theo học phần',
  })
  async getByLesson(
    @CurrentUser() user: IAuthPayload,
    @Args('lessonId') lessonId: string,
    @Args('chapterPageOptions', { nullable: true })
    chapterPageOptions: ChapterPageOptions = new ChapterPageOptions(),
  ): Promise<ChapterPagination> {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return this.chapterService.findAll(
      isAdmin ? null : user.id,
      lessonId,
      chapterPageOptions,
    );
  }

  // @Permissions(PermissionEnum.MY_CHAPTER)
  // @Query(() => ChapterPagination, {
  //   name: 'myChapters',
  //   description: 'Lấy danh sách chương user',
  // })
  // async myChapters(
  //   @CurrentUser() user: IAuthPayload,
  //   @Args('chapterPageOptions', { nullable: true })
  //   chapterPageOptions: ChapterPageOptions = new ChapterPageOptions(),
  // ): Promise<ChapterPagination> {
  //   return this.chapterService.findAll(user.id, null, chapterPageOptions);
  // }

  @Permissions(PermissionEnum.DETAIL_CHAPTER)
  @Query(() => ChapterDetailDto, { name: 'chapter' })
  async chapter(@Args('chapterId') id: string): Promise<ChapterDetailDto> {
    return this.chapterService.detailChapter(id);
  }

  @Permissions(PermissionEnum.ADD_CHAPTER)
  @Mutation(() => ChapterEntity, { name: 'createChapter' })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createChapterArgs') dto: CreateChapterDto,
  ): Promise<ChapterEntity> {
    const data = CreateChapterDto.plainToClass(dto);
    data.createBy = user.id;
    return await this.chapterService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_CHAPTER)
  @Mutation(() => ChapterEntity, { name: 'updateChapter' })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('id') id: string,
    @Args('updateChapterArgs') dto: UpdateChapterDto,
  ): Promise<ChapterEntity> {
    const data = plainToClass(UpdateChapterDto, dto);
    delete data.id;
    data.updateBy = user.id;
    return await this.chapterService.update(id, data);
  }

  @Permissions(PermissionEnum.UPDATE_CHAPTER)
  @Mutation(() => String, {
    name: 'enableChapters',
    description: 'Kích hoạt chương',
  })
  async enableChapters(
    @CurrentUser() user: IAuthPayload,
    @Args('enableChaptersArgs') dto: EnableChaptersDto,
  ): Promise<string> {
    const data = plainToClass(EnableChaptersDto, dto);
    data.updateBy = user.id ? user.id : null;
    return await this.chapterService.enable(data);
  }

  @Permissions(PermissionEnum.DELETE_CHAPTER)
  @Mutation(() => [String], { name: 'deleteChapters' })
  async deleteMany(
    @Args('chapterIds', { type: () => [String] }) chapterIds: string[],
  ): Promise<string> {
    return await this.chapterService.deleteMany(chapterIds);
  }
}
