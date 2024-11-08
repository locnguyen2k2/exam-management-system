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
import { LessonService } from '~/modules/system/lesson/lesson.service';
import { QuestionService } from '~/modules/system/question/question.service';
import { ChapterDetailDto } from '~/modules/system/chapter/dtos/chapter-res.dto';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { paginate } from '~/helpers/paginate/paginate';
import { QuestionPageOptions } from '~/modules/system/question/dtos/question-req.dto';
import { searchIndexes } from '~/utils/search';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';

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
    pageOptions: ChapterPageOptions = new ChapterPageOptions(),
  ): Promise<PageDto<ChapterDetailDto>> {
    const filterOptions = [
      {
        $match: {
          ...(!_.isNil(pageOptions.enable) && {
            enable: pageOptions.enable,
          }),

          ...(!_.isEmpty(pageOptions.chapterStatus) && {
            status: {
              $all: pageOptions.chapterStatus,
            },
          }),
          ...(uid && {
            $and: [{ create_by: uid }],
          }),
        },
      },
    ];

    const paginated = await paginate(
      this.chapterRepo,
      { pageOptions, filterOptions },
      searchIndexes(pageOptions.keyword),
    );
    const detailChapters = new Array(paginated.data.length);

    await Promise.all(
      paginated.data.map(async (chapter, index) => {
        detailChapters[index] = {
          ...chapter,
          lesson: await this.lessonService.findByChapter(chapter.id),
        };
      }),
    );

    return { data: detailChapters, meta: paginated.meta };
  }

  async findAvailable(id: string, uid?: string): Promise<ChapterEntity> {
    const chapter = await this.findOne(id);

    if (chapter && (!uid || (uid && chapter.create_by === uid))) return chapter;

    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
  }

  async detail(id: string, uid?: string) {
    const chapter = await this.findAvailable(id, uid);

    return {
      ...chapter,
      lesson: await this.lessonService.findByChapter(chapter.id),
    };
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

  async findByQuizContent(content: string): Promise<ChapterEntity> {
    const handleContent = content
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');

    const isExisted = await this.chapterRepo.findOne({
      where: {
        'questions.content': { $regex: handleContent, $options: 'i' },
      },
    });

    if (isExisted) return isExisted;
  }

  async create(data: CreateChaptersDto): Promise<ChapterEntity[]> {
    const newChapters: ChapterEntity[] = [];
    const lessonChapters: {
      chapterIds: string[];
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
              chapterIds: [newChapter.id],
            });
          } else {
            !lessonChapters[index].chapterIds.find(
              (chapterId) => chapterId === newChapter.id,
            ) && lessonChapters[index].chapterIds.push(newChapter.id);
          }
        }

        newChapters.push(newChapter);
      }),
    );

    const createChapters = this.chapterRepo.create(newChapters);

    const result = await this.chapterRepo.save(createChapters);

    lessonChapters.map(async ({ lessonId, chapterIds }) => {
      const listChapterId = chapterIds.map(
        (chapterId) => result.find(({ id }) => chapterId === id).id,
      );
      const lesson = await this.lessonService.findOne(lessonId);
      await this.lessonService.updateChapters(lessonId, [
        ...lesson.chapterIds,
        ...listChapterId,
      ]);
    });

    return result;
  }

  async update(id: string, data: UpdateChapterDto): Promise<ChapterEntity> {
    const isExisted = await this.findOne(id);
    let oldLesson: LessonEntity;
    let newLesson: LessonEntity;
    let oldChapters = [];
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

      const isReplaced = newLesson.chapterIds.find(
        (chapterId) => chapterId === id,
      );

      if (!isReplaced) {
        oldLesson = await this.lessonService.findByChapter(isExisted.id);

        if (oldLesson?.id) {
          if (oldLesson.chapterIds && oldLesson.chapterIds.length > 0) {
            oldChapters = oldLesson.chapterIds.filter(
              (chapterId) => chapterId !== id,
            );
          }
        }

        if (newLesson.chapterIds && newLesson.chapterIds.length > 0) {
          newChapters = newLesson.chapterIds.filter(
            (chapterId) => chapterId !== id,
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
        ...(!_.isNil(data?.status) && { status: data.status }),
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
        isExisted.id,
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
        await this.findAvailable(id, uid);
        if ((await this.questionService.findByChapter(id)).length !== 0)
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);

        const lesson = await this.lessonService.findByChapter(id);
        const newChapterIds = lesson.chapterIds.filter(
          (chapterId) => chapterId !== id,
        );

        await this.lessonService.updateChapters(lesson.id, newChapterIds);
        listChapterIds.push(id);
      }),
    );

    await this.chapterRepo.deleteMany({ id: { $in: listChapterIds } });

    return 'Xóa thành công!';
  }

  async findQuizzes(
    chapterId: string,
    pageOptions: QuestionPageOptions = new QuestionPageOptions(),
    uid: string,
  ) {
    const filterOptions = [
      {
        $unwind: '$questions',
      },
      {
        $match: {
          id: chapterId,
          ...(!_.isEmpty(pageOptions.questionCategory) && {
            'questions.category': { $all: pageOptions.questionCategory },
          }),
          ...(!_.isEmpty(pageOptions.questionLevel) && {
            'questions.level': { $all: pageOptions.questionLevel },
          }),
          ...(!_.isEmpty(pageOptions.questionStatus) && {
            'questions.status': { $all: pageOptions.questionStatus },
          }),
          ...(!_.isNil(pageOptions.enable) && {
            'questions.enable': pageOptions.enable,
          }),
          ...(uid && {
            $or: [{ create_by: uid }],
          }),
        },
      },
      { $skip: pageOptions.skip },
      { $limit: pageOptions.take },
      {
        $sort: {
          [`questions.${pageOptions.sort}`]: !pageOptions.sorted ? -1 : 1,
        },
      },
    ];

    const groups = [
      { $group: { _id: null, questions: { $push: '$questions' } } },
    ];

    return await paginate(
      this.chapterRepo,
      {
        filterOptions,
        groups,
        pageOptions,
        lookups: null,
      },
      searchIndexes(pageOptions.keyword),
    );
  }

  async findAvailableQuiz(
    questionId: string,
    uid: string,
  ): Promise<{ chapterId: string; question: QuestionEntity }> {
    const isExisted = await this.chapterRepo.findOne({
      where: {
        'questions.id': questionId,
        create_by: uid,
      },
    });

    if (!isExisted)
      throw new BusinessException(
        ErrorEnum.RECORD_NOT_FOUND,
        `Question ${questionId}`,
      );

    const question = isExisted.questions.find(
      (question) => question.id === questionId,
    );

    return { chapterId: isExisted.id, question };
  }

  async updateQuiz(chapterId: string, question: any): Promise<ChapterEntity> {
    const isExisted = await this.findOne(chapterId);

    const listQuestions: QuestionEntity[] = isExisted.questions.filter(
      (isQuestion) => {
        if (isQuestion.id !== question.id) return isQuestion;
      },
    );

    await this.chapterRepo.update(
      { id: chapterId },
      { questions: [...listQuestions, question] },
    );

    return await this.findOne(chapterId);
  }

  async addQuizzes(chapterId: string, questions: QuestionEntity[]) {
    await this.chapterRepo.findOneAndUpdate(
      { id: chapterId },
      {
        $push: { questions: { $each: questions } },
      },
    );

    return true;
  }

  async updateQuizzes(
    chapterId: string,
    quizzes: QuestionEntity[],
  ): Promise<ChapterEntity> {
    await this.chapterRepo.update(
      {
        id: chapterId,
      },
      {
        questions: quizzes,
      },
    );

    return await this.findOne(chapterId);
  }

  async randQuizzes(
    chapterId: string,
    level: LevelEnum,
    quantity: number,
    uid: string,
  ) {
    const data = await this.chapterRepo
      .aggregate([
        {
          $match: {
            id: chapterId,
            create_by: uid,
            'questions.level': level,
          },
        },
        {
          $project: {
            questions: {
              $filter: {
                input: '$questions',
                as: 'question',
                cond: {
                  $and: [
                    { $eq: ['$$question.level', level] },
                    { $eq: ['$$question.enable', true] },
                  ],
                },
              },
            },
          },
        },
        { $unwind: '$questions' },
        { $sample: { size: quantity } },
        { $group: { _id: '$id', questions: { $push: '$questions' } } },
      ])
      .toArray();

    const questions = data[0]?.questions ? data[0].questions : [];

    return questions;
  }
}
