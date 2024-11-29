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
import { LevelEnum } from '~/modules/system/question/enum/level.enum';
import { paginate } from '~/helpers/paginate/paginate';
import { QuestionPageOptions } from '~/modules/system/question/dtos/question-req.dto';
import { searchAtlas, searchIndexes } from '~/utils/search';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';
import { CategoryEnum } from '~/modules/system/question/enum/category.enum';

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

  async findByName(name: string, uid?: string): Promise<ChapterEntity[]> {
    const handleName = name
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');

    return await this.chapterRepo.find({
      name: { $regex: handleName, $options: 'i' },
      ...(uid && {
        $or: [{ create_by: uid }],
      }),
    });
  }

  async isReplacedNameByUid(name: string, uid: string): Promise<ChapterEntity> {
    const isReplaced = await this.findByName(name, uid);

    const replacedName = name.replaceAll(' ', '').toLowerCase();

    return isReplaced.find(
      ({ name }) => name.replaceAll(' ', '').toLowerCase() === replacedName,
    );
  }

  async isReplacedNameById(
    name: string,
    uid: string,
    chapterId: string,
  ): Promise<ChapterEntity> {
    const isReplaced = await this.findByName(name, uid);
    const replacedName = name.replaceAll(' ', '').toLowerCase();

    return isReplaced.find(
      ({ name, id }) =>
        name.replaceAll(' ', '').toLowerCase() === replacedName &&
        id !== chapterId,
    );
  }

  async findByQuizContent(
    content: string,
    uid?: string,
  ): Promise<ChapterEntity[]> {
    const handleContent = content
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');

    return await this.chapterRepo.find({
      'questions.content': { $regex: handleContent, $options: 'i' },
      ...(uid && {
        $or: [{ create_by: uid }],
      }),
    });
  }

  async isReplacedContentByUid(
    content: string,
    uid: string,
  ): Promise<ChapterEntity> {
    const isReplaced = await this.findByQuizContent(content, uid);

    const replacedContent = content.replaceAll(' ', '').toLowerCase();

    return isReplaced.find(({ questions }) =>
      questions.some(
        (question) =>
          question.content.replaceAll(' ', '').toLowerCase() ===
          replacedContent,
      ),
    );
  }

  async isReplacedContentById(
    content: string,
    uid: string,
    questionId: string,
  ): Promise<ChapterEntity> {
    const isReplaced = await this.findByQuizContent(content, uid);
    const replacedContent = content.replaceAll(' ', '').toLowerCase();

    return isReplaced.find(({ questions }) =>
      questions.some(
        (question) =>
          question.content.replaceAll(' ', '').toLowerCase() ===
            replacedContent && question.id !== questionId,
      ),
    );
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

        const isExisted = await this.isReplacedNameByUid(
          chapData.name,
          data.createBy,
        );

        if (isExisted)
          throw new BusinessException(ErrorEnum.RECORD_EXISTED, chapData.name);

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
            if (
              !lessonChapters[index].chapterIds.find(
                (chapterId) => chapterId === newChapter.id,
              )
            )
              lessonChapters[index].chapterIds.push(newChapter.id);
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
    let oldLesson: LessonEntity = null;
    let newLesson: LessonEntity;
    let oldChapters = [];
    let newChapters = [];

    if (isExisted.create_by !== data.updateBy)
      throw new BusinessException(ErrorEnum.NO_PERMISSON, id);

    if (!_.isEmpty(data.name)) {
      const isReplaced = await this.isReplacedNameById(
        data.name,
        data.updateBy,
        id,
      );

      if (isReplaced)
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.name);
    }

    if (!_.isNil(data.lessonId)) {
      newLesson = await this.lessonService.findAvailable(
        data.lessonId,
        data.updateBy,
      );

      const isReplaced = newLesson.chapterIds.find((chapId) => chapId === id);

      oldLesson = isReplaced
        ? await this.lessonService.findByChapter(isExisted.id)
        : null;

      if (oldLesson && oldLesson.chapterIds && oldLesson.chapterIds.length > 0)
        oldChapters = oldLesson.chapterIds.filter((chapId) => chapId !== id);

      if (newLesson.chapterIds && newLesson.chapterIds.length > 0)
        newChapters = newLesson.chapterIds.filter((chapId) => chapId !== id);
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
        updated_at: data.updated_at,
      },
    );

    const result = await this.findOne(id);

    if (oldLesson)
      await this.lessonService.updateChapters(oldLesson.id, oldChapters);

    if (newLesson)
      await this.lessonService.updateChapters(newLesson.id, [
        ...newChapters,
        isExisted.id,
      ]);

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

  async deleteMany(ids: string[], uid?: string): Promise<string> {
    const listChapterIds: string[] = [];
    await Promise.all(
      ids.map(async (id) => {
        await this.findAvailable(id, uid);
        // if ((await this.questionService.findByChapter(id)).length !== 0)
        //   throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);

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

  async getQuizzesByChapterId(chapterId: string): Promise<QuestionEntity[]> {
    const chapter = await this.findOne(chapterId);
    return chapter.questions;
  }

  async getLessonByChapterId(chapterId: string): Promise<LessonEntity> {
    await this.findOne(chapterId);
    return await this.lessonService.findByChapter(chapterId);
  }

  async getQuizzesByLessonId(chapterId: string): Promise<QuestionEntity[]> {
    const { id } = await this.lessonService.findByChapter(chapterId);
    const { chapters } = await this.lessonService.detailLesson(id);

    return chapters.flatMap(({ questions }) => questions);
  }

  async findQuizzes(
    pageOptions: QuestionPageOptions = new QuestionPageOptions(),
    uid: string,
  ) {
    const filterOptions = [
      {
        $addFields: {
          textScore: { $meta: 'searchScore' },
        },
      },
      {
        $unwind: '$questions',
      },
      {
        $match: {
          ...(!_.isEmpty(pageOptions.chapterId) && {
            id: { $all: pageOptions.chapterId },
          }),
          ...(!_.isEmpty(pageOptions.keyword) && {
            'questions.content': {
              $regex: pageOptions.keyword
                .replace(regSpecialChars, '\\$&')
                .replace(regWhiteSpace, '\\s*'),
              $options: 'i',
            },
          }),
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
          textScore: -1,
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
      searchAtlas('searchQuestion', pageOptions.keyword),
    );
  }

  async findAvailableQuiz(
    questionId: string,
    uid: string = null,
  ): Promise<{ chapterId: string; question: QuestionEntity }> {
    const isExisted = await this.chapterRepo.findOne({
      where: {
        'questions.id': questionId,
        ...(uid && { create_by: uid }),
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
    category: CategoryEnum,
    quantity: number,
    uid: string,
    score: number,
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
                    { $eq: ['$$question.category', category] },
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
        { $addFields: { 'questions.questionScore': score } },
        { $group: { _id: '$id', questions: { $push: '$questions' } } },
      ])
      .toArray();

    return data[0]?.questions ? data[0].questions : [];
  }
}
