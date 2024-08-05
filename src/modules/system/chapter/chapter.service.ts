import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { MongoRepository } from 'typeorm';
import {
  ChapterPageOptions,
  CreateChapterDto,
  UpdateChapterDto,
  EnableChaptersDto,
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
import { ChapterPagination } from '~/modules/system/chapter/dtos/chapter-res.dto';
import { searchIndexes } from '~/utils/search';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { LessonService } from '~/modules/system/lession/lesson.service';
import { IDetailChapter } from '~/modules/system/question/question.service';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';

@Injectable()
export class ChapterService {
  constructor(
    @InjectRepository(ChapterEntity)
    private readonly chapterRepo: MongoRepository<ChapterEntity>,
    private readonly lessonService: LessonService,
  ) {}

  async findAll(
    uid: string = null,
    lessonId: string = null,
    pageOptions: ChapterPageOptions = new ChapterPageOptions(),
  ): Promise<ChapterPagination> {
    const filterOptions = {
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),

      ...(!_.isNil(lessonId) && {
        lessonId,
      }),

      ...(!_.isEmpty(pageOptions.chapterStatus) && {
        status: {
          $in: pageOptions.chapterStatus,
        },
      }),

      ...(!_.isNil(uid) && { create_by: uid }),
    };

    const pipeLine = [
      searchIndexes(pageOptions.keyword),
      {
        $facet: {
          data: [
            { $match: filterOptions },
            { $skip: pageOptions.skip },
            { $limit: pageOptions.take },
            { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
          ],
          pageInfo: [{ $match: filterOptions }, { $count: 'numberRecords' }],
        },
      },
    ];

    const [{ data, pageInfo }]: any[] = await this.chapterRepo
      .aggregate([...pipeLine])
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });
    return new ChapterPagination(entities, pageMetaDto);
  }

  async findOne(id: string): Promise<ChapterEntity> {
    const isExisted = await this.chapterRepo.findOneBy({ id });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async detailByLesson(
    chapId: string,
    questId: string,
  ): Promise<ChapterEntity> {
    const isExisted = await this.chapterRepo.findOneBy({
      id: chapId,
      questionIds: {
        $all: [questId],
      },
    });
    if (isExisted) return isExisted;
  }

  async isQuestionInChapters(questId: string): Promise<boolean> {
    const isExisted = await this.chapterRepo.findBy({
      questionIds: {
        $all: [questId],
      },
    });
    return isExisted.length > 0;
  }

  async chapterHasQuestions(
    questionIds: string[],
    chapterId: string,
  ): Promise<boolean> {
    const isExisted = await this.findOne(chapterId);

    return isExisted.questionIds.some((questId: string) =>
      questionIds.includes(questId),
    );
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

  async findAvailableById(id: string): Promise<ChapterEntity> {
    const isExisted = await this.chapterRepo.findOneBy({ id });
    if (
      !isExisted ||
      !isExisted.enable ||
      isExisted.status !== StatusShareEnum.PUBLIC ||
      isExisted.questionIds.length === 0
    )
      throw new BusinessException(`400:Bản ghi ${id} không có sẵn`);

    return isExisted;
  }

  async validateQuestions(
    lessonId: string,
    questions: QuestionEntity[],
    chapterId: string,
  ): Promise<IDetailChapter> {
    const lesson = await this.lessonService.findOne(lessonId);
    const chapter = await this.findOne(chapterId);
    const isChapter = lesson.chapterIds.includes(chapterId);
    const isQuestion = questions.some(
      ({ id }) => chapter.questionIds.indexOf(id) === -1,
    );

    if (!isChapter)
      throw new BusinessException(
        `400:Học phần ${lesson.name} không có ${chapter.name}`,
      );
    if (isQuestion)
      throw new BusinessException(
        `400:Có câu hỏi không có trong chương ${chapter.name}`,
      );

    return { chapter, questions };
  }

  async create(data: CreateChapterDto): Promise<ChapterEntity> {
    const isExisted = await this.findByName(data.name);
    if (isExisted) throw new BusinessException('400:Tên chương đã tồn tại');

    const chapter = new ChapterEntity({
      ...data,
      create_by: data.createBy,
      update_by: data.createBy,
    });

    const newChapter = this.chapterRepo.create(chapter);
    return await this.chapterRepo.save(newChapter);
  }

  async update(id: string, data: UpdateChapterDto): Promise<ChapterEntity> {
    const isExisted = await this.findOne(id);

    if (!_.isNil(data.lessonId)) {
      const newLesson = await this.lessonService.findOne(data.lessonId);
      const oldLesson = await this.lessonService.findOne(isExisted.lessonId);
      const indexReplace = newLesson.chapterIds.indexOf(id, 0);

      if (indexReplace === -1 && newLesson.id !== oldLesson.id) {
        const index = oldLesson.chapterIds.indexOf(id, 0);

        index > -1 && oldLesson.chapterIds.splice(index, 1);

        await this.lessonService.update(newLesson.id, {
          chapterIds: [...newLesson.chapterIds, id],
          updateBy: data.updateBy,
        });

        await this.lessonService.update(oldLesson.id, {
          chapterIds: oldLesson.chapterIds,
          updateBy: data.updateBy,
        });
      }
    }

    const { affected } = await this.chapterRepo.update(
      { id },
      {
        ...(data?.name && { name: data.name }),
        ...(data?.label && { label: data.label }),
        ...(data?.updateBy && { update_by: data.updateBy }),
        ...(!_.isNil(data?.enable) && { enable: data.enable }),
        ...(data?.description && { description: data.description }),
        ...(!_.isNil(data.lessonId) && { lessonId: data.lessonId }),
        update_by: data.updateBy,
      },
    );
    return affected ? await this.findOne(id) : isExisted;
  }

  async enable(data: EnableChaptersDto): Promise<string> {
    await Promise.all(
      data.chaptersEnable.map(async ({ chapterId }) => {
        await this.findOne(chapterId);
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
        await this.findOne(chapterId);
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

  async addQuestion(id: string, questionId: string): Promise<ChapterEntity> {
    const isExisted = await this.findOne(id);
    const { affected } = await this.chapterRepo.findOneAndUpdate(
      { id },
      {
        $push: {
          questionIds: questionId,
        },
      },
    );
    if (affected === 0) return isExisted;
    return await this.findOne(id);
  }

  async deleteMany(ids: string[]): Promise<string> {
    const listChapterIds: string[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.findOne(id);
        isExisted.questionIds.length === 0 && listChapterIds.push(id);
      }),
    );
    if (listChapterIds.length === 0)
      throw new BusinessException(ErrorEnum.RECORD_IN_USED);
    await this.chapterRepo.deleteMany({
      where: { id: { $in: listChapterIds } },
    });
    return 'Xóa thành công!';
  }
}
