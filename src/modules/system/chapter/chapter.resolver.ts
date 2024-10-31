import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import {
  ChapterPageOptions,
  CreateChaptersDto,
  EnableChaptersDto,
  UpdateChapterDto,
  UpdateChaptersStatusDto,
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
import { PageDto } from '~/common/dtos/pagination/pagination.dto';

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
  ) {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );
    return this.chapterService.findAll(
      isAdmin ? null : user.id,
      null,
      chapterPageOptions,
    );
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
  @Query(() => ChapterDetailDto, {
    name: 'chapter',
    description: 'Lấy chi tiết chương',
  })
  async chapter(
    @Args('chapterId') id: string,
    @CurrentUser() user: IAuthPayload,
  ): Promise<ChapterDetailDto> {
    return this.chapterService.findAvailableChapterById(id, user.id);
  }

  @Permissions(PermissionEnum.ADD_CHAPTER)
  @Mutation(() => [ChapterEntity], {
    name: 'createChapters',
    description: 'Tạo chương',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createChaptersArgs') dto: CreateChaptersDto,
  ): Promise<ChapterEntity[]> {
    const data = plainToClass(CreateChaptersDto, dto);
    data.createBy = user.id;
    return await this.chapterService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_CHAPTER)
  @Mutation(() => ChapterEntity, {
    name: 'updateChapter',
    description: 'Cập nhật chương',
  })
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

  @Permissions(PermissionEnum.UPDATE_CHAPTER)
  @Mutation(() => String, {
    name: 'updateChaptersStatus',
    description: 'Cập nhật trạng thái chương',
  })
  async updateChaptersStatus(
    @CurrentUser() user: IAuthPayload,
    @Args('updateChaptersStatusArgs') dto: UpdateChaptersStatusDto,
  ): Promise<string> {
    const data = plainToClass(UpdateChaptersStatusDto, dto);
    data.updateBy = user.id ? user.id : null;
    return await this.chapterService.updateStatus(data);
  }

  @Permissions(PermissionEnum.DELETE_CHAPTER)
  @Mutation(() => String, {
    name: 'deleteChapters',
    description: 'Xóa danh sách các chương',
  })
  async deleteMany(
    @CurrentUser() user: IAuthPayload,
    @Args('chapterIds', { type: () => [String] }) chapterIds: string[],
  ): Promise<string> {
    return await this.chapterService.deleteMany(chapterIds, user.id);
  }
}
