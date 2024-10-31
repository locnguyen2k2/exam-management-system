import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { MongoRepository } from 'typeorm';
import {
  ChapterPageOptions,
  CreateChaptersDto,
  EnableChaptersDto,
  UpdateChapterDto,
  UpdateChaptersStatusDto,
} from '~/modules/system/chapter/dtos/chapter-req.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';

import * as _ from 'lodash';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { searchIndexes } from '~/utils/search';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { LessonService } from '~/modules/system/lesson/lesson.service';
import { pipeLine } from '~/utils/pipe-line';
import { QuestionService } from '~/modules/system/question/question.service';
import { paginate } from '~/helpers/paginate/paginate';
import { ChapterPagination } from '~/modules/system/chapter/dtos/chapter-res.dto';

@Injectable()
export class ChapterService {
  constructor(
    @Inject(forwardRef(() => LessonService))
    private readonly lessonService: LessonService,
    @Inject(forwardRef(() => QuestionService))
    private readonly questionService: QuestionService,
    @InjectRepository(ChapterEntity)
    private readonly chapterRepo: MongoRepository<ChapterEntity>,
  ) {}

  async findAll(
    uid: string = null,
    lessonId: string = null,
    pageOptions: ChapterPageOptions = new ChapterPageOptions(),
  ) {
    const filterOptions = {
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),

      ...(!_.isEmpty(pageOptions.chapterStatus) && {
        status: {
          $in: pageOptions.chapterStatus,
        },
      }),

      ...(uid && {
        $or: [{ create_by: uid }],
      }),
    };

    const pipes = [...pipeLine(pageOptions, filterOptions)];

    const [{ data, pageInfo }]: any[] = await this.chapterRepo
      .aggregate(pipes)
      .toArray();

    await Promise.all(
      data.map(async (chapter) => {
        const lesson = await this.lessonService.findByChapter(chapter.id);
        if (lesson.length > 0) {
          chapter['lesson'] = lesson[0];
        }
      }),
    );

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });

    return new ChapterPagination(entities, pageMetaDto);
  }

  async findAvailableChapterById(id: string, uid?: string): Promise<any> {
    const chapter = await this.chapterRepo
      .aggregate([{ $match: { id } }])
      .toArray();

    if (chapter.length > 0 && (!uid || (uid && chapter[0].create_by === uid)))
      return chapter[0];
    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
  }

  async findOne(id: string): Promise<ChapterEntity> {
    const isExisted = await this.chapterRepo.findOneBy({ id });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async findByName(name: string): Promise<ChapterEntity> {
    const handleName = name
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');
    const isExisted = await this.chapterRepo.findOneBy({
      name: { $regex: handleName, $options: 'i' },
    });
    if (isExisted) return isExisted;
  }

  async findAvailable(): Promise<ChapterEntity[]> {
    return await this.chapterRepo.findBy({
      enable: true,
      status: StatusShareEnum.PUBLIC,
    });
  }

  async findAvailableById(id: string, uid: string): Promise<ChapterEntity> {
    const isExisted = await this.findOne(id);
    if (isExisted && isExisted.enable && isExisted.create_by === uid)
      return isExisted;

    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
  }

  async lessonHasChapter(
    lessonId: string,
    chapterId: string,
  ): Promise<boolean> {
    const lesson = await this.lessonService.findOne(lessonId);

    return lesson.chapters.some(({ id }) => id === chapterId);
  }

  async create(data: CreateChaptersDto): Promise<ChapterEntity[]> {
    const newChapters: ChapterEntity[] = [];
    const lessonChapters: {
      chapters: ChapterEntity[];
      lessonId: string;
    }[] = [];

    await Promise.all(
      data.chapters.map(async (chapData: any) => {
        await this.lessonService.findAvailable(
          chapData.lessonId,
          data.createBy,
        );

        const isExisted = await this.findByName(chapData.name);

        if (isExisted && isExisted.create_by === data.createBy)
          throw new BusinessException(ErrorEnum.RECORD_EXISTED, chapData.name);

        const isReplaced = newChapters.find(
          (chap: ChapterEntity) =>
            chap.name.toLowerCase().replace(/\s/g, '') ===
            chapData.name.toLowerCase().replace(/\s/g, ''),
        );

        if (isReplaced) {
          throw new BusinessException(
            `400:Tên chương bị trùng! ${isReplaced.name}`,
          );
        }

        delete chapData.questionIds;

        const newChapter = new ChapterEntity({
          ...chapData,
          create_by: data.createBy,
          update_by: data.createBy,
        });

        if (!_.isEmpty(chapData.lessonId)) {
          const lesson = await this.lessonService.findAvailable(
            chapData.lessonId,
            data.createBy,
          );

          delete chapData.lessonId;

          const index = lessonChapters.findIndex(
            ({ lessonId }) => lessonId === lesson.id,
          );

          if (index === -1) {
            lessonChapters.push({
              lessonId: lesson.id,
              chapters: [newChapter],
            });
          } else {
            !lessonChapters[index].chapters.find(
              ({ id }) => id === newChapter.id,
            ) && lessonChapters[index].chapters.push(newChapter);
          }
        }

        newChapters.push(newChapter);
      }),
    );

    const createChapters = this.chapterRepo.create(newChapters);

    const result = await this.chapterRepo.save(createChapters);

    lessonChapters.map(async ({ lessonId, chapters }) => {
      const listChapter = chapters.map((chapter) =>
        result.find(({ id }) => chapter.id === id),
      );
      const lesson = await this.lessonService.findOne(lessonId);
      await this.lessonService.updateChapters(lessonId, [
        ...lesson.chapters,
        ...listChapter,
      ]);
    });

    return result;
  }

  async update(id: string, data: UpdateChapterDto): Promise<ChapterEntity> {
    const isExisted = await this.findOne(id);
    let oldLesson = null;
    let oldChapters = [];
    let newLesson = null;
    let newChapters = [];

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException(ErrorEnum.NO_PERMISSON, id);
    }

    if (!_.isNil(data.name) && !_.isEmpty(data.name)) {
      const isReplaced = await this.findByName(data.name);
      if (isReplaced && isReplaced.create_by === data.updateBy) {
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.name);
      }
    }

    if (!_.isNil(data.lessonId)) {
      newLesson = await this.lessonService.findAvailable(
        data.lessonId,
        data.updateBy,
      );

      const isReplaced = newLesson.chapters.find(
        (chapter) => chapter.id === id,
      );

      if (!isReplaced) {
        oldLesson = (await this.lessonService.findByChapter(isExisted.id))[0];

        if (oldLesson?.id) {
          if (oldLesson?.chapters && oldLesson.chapters.length > 0) {
            oldChapters = oldLesson.chapters.filter(
              (chapter) => chapter.id !== id,
            );
          }
        }

        if (newLesson?.chapters && newLesson.chapters.length > 0) {
          newChapters = newLesson.chapters.filter(
            (chapter) => chapter.id !== id,
          );
        }
      }
    }

    await this.chapterRepo.update(
      { id },
      {
        ...(data?.name && { name: data.name }),
        ...(data?.label && { label: data.label }),
        ...(data?.updateBy && { update_by: data.updateBy }),
        ...(!_.isNil(data?.enable) && { enable: data.enable }),
        ...(data?.description && { description: data.description }),
        update_by: data.updateBy,
      },
    );

    const result = await this.findOne(id);

    oldLesson &&
      (await this.lessonService.updateChapters(oldLesson.id, oldChapters));
    newLesson &&
      (await this.lessonService.updateChapters(newLesson.id, [
        ...newChapters,
        isExisted,
      ]));

    return result;
  }

  async enable(data: EnableChaptersDto): Promise<string> {
    await Promise.all(
      data.chaptersEnable.map(async ({ chapterId }) => {
        const isExisted = await this.findOne(chapterId);
        if (isExisted.create_by !== data.updateBy) {
          throw new BusinessException(ErrorEnum.NO_PERMISSON, chapterId);
        }
      }),
    );

    await Promise.all(
      data.chaptersEnable.map(async ({ chapterId, enable }) => {
        await this.chapterRepo.update(
          { id: chapterId },
          { enable, update_by: data.updateBy },
        );
      }),
    );

    return 'Cập nhật thành công!';
  }

  async updateStatus(data: UpdateChaptersStatusDto): Promise<string> {
    await Promise.all(
      data.chaptersStatus.map(async ({ chapterId }) => {
        const isExisted = await this.findOne(chapterId);
        if (isExisted.create_by !== data.updateBy) {
          throw new BusinessException(ErrorEnum.NO_PERMISSON, chapterId);
        }
      }),
    );

    await Promise.all(
      data.chaptersStatus.map(async ({ chapterId, status }) => {
        await this.chapterRepo.update(
          { id: chapterId },
          { status, update_by: data.updateBy },
        );
      }),
    );

    return 'Cập nhật thành công!';
  }

  async deleteMany(ids: string[], uid: string): Promise<string> {
    const listChapterIds: string[] = [];
    await Promise.all(
      ids.map(async (id) => {
        await this.findAvailableChapterById(id, uid);
        if ((await this.questionService.findByChapter(id)).length !== 0)
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);

        const lessons = await this.lessonService.findByChapter(id);
        await Promise.all(
          lessons.map(async (lesson) => {
            const newChapters = lesson.chapters.filter(
              (chapter) => chapter.id !== id,
            );
            await this.lessonService.updateChapters(lesson.id, newChapters);
          }),
        );
        listChapterIds.push(id);
      }),
    );

    await this.chapterRepo.deleteMany({ id: { $in: listChapterIds } });

    return 'Xóa thành công!';
  }
}
