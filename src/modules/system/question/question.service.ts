import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateQuestionsDto,
  QuestionPageOptions,
  UpdateQuestionDto,
  UpdateQuestionStatusDto,
} from '~/modules/system/question/dtos/question-req.dto';
import { AnswerService } from '~/modules/system/answer/answer.service';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';

import * as _ from 'lodash';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { QuestionPagination } from '~/modules/system/question/dtos/question-res.dto';
import { UpdateChaptersStatusDto } from '~/modules/system/chapter/dtos/chapter-req.dto';
import { searchIndexes } from '~/utils/search';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { QuestionInfoDto } from '~/modules/system/exam/dtos/exam-req.dto.';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';

export interface IDetailChapter {
  chapter: ChapterEntity;
  questions: QuestionEntity[];
}

export interface IClassifyChapter {
  chapterId: string;
  questions: QuestionEntity[];
}

export interface IClassifyLevel {
  chapterId: string;
  info: { level: LevelEnum; questions: QuestionEntity[] }[];
}

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: MongoRepository<QuestionEntity>,
    private readonly answerService: AnswerService,
    private readonly chapterService: ChapterService,
  ) {}

  async findAll(
    uid: string,
    pageOptions: QuestionPageOptions = new QuestionPageOptions(),
  ): Promise<QuestionPagination> {
    const filterOptions = {
      ...(!_.isEmpty(pageOptions.questionCategory) && {
        category: { $in: pageOptions.questionCategory },
      }),
      ...(!_.isEmpty(pageOptions.questionLevel) && {
        level: { $in: pageOptions.questionLevel },
      }),
      ...(!_.isEmpty(pageOptions.questionStatus) && {
        status: { $in: pageOptions.questionStatus },
      }),
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),
    };

    const pipeLine: any[] = [
      searchIndexes(pageOptions.keyword),
      {
        $facet: {
          data: [
            {
              $match: {
                $or: [
                  { status: StatusShareEnum.PUBLIC },
                  { enable: true },
                  { enable: false, create_by: uid },
                  {
                    status: StatusShareEnum.PRIVATE,
                    create_by: uid,
                  },
                ],
              },
            },
            {
              $lookup: {
                from: 'answer_entity',
                localField: 'answerIds',
                foreignField: 'id',
                as: 'answers',
              },
            },
            {
              $lookup: {
                from: 'answer_entity',
                localField: 'correctAnswerId',
                foreignField: 'id',
                as: 'correctAnswer',
              },
            },
            {
              $addFields: {
                correctAnswer: { $arrayElemAt: ['$correctAnswer', 0] }, // Ensure only one item in array
                chapter: { $arrayElemAt: ['$chapter', 0] }, // Ensure only one item in array
              },
            },
            { $match: filterOptions },
            { $skip: pageOptions.skip },
            { $limit: pageOptions.take },
            { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
          ],
          pageInfo: [{ $match: filterOptions }, { $count: 'numberRecords' }],
        },
      },
    ];

    const [{ data, pageInfo }]: any[] = await this.questionRepo
      .aggregate([...pipeLine])
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });
    return new QuestionPagination(entities, pageMetaDto);
  }

  async detailQuestion(id: string): Promise<any> {
    const isExisted = await this.questionRepo
      .aggregate([
        {
          $lookup: {
            from: 'answer_entity',
            localField: 'answerIds',
            foreignField: 'id',
            as: 'answers',
          },
        },
        {
          $lookup: {
            from: 'answer_entity',
            localField: 'correctAnswerId',
            foreignField: 'id',
            as: 'correctAnswer',
          },
        },
        {
          $addFields: {
            correctAnswer: { $arrayElemAt: ['$correctAnswer', 0] }, // Ensure only one item in array
            chapter: { $arrayElemAt: ['$chapter', 0] }, // Ensure only one item in array
          },
        },
        { $match: { id } },
      ])
      .toArray();

    if (isExisted.length > 0) return isExisted[0];
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async findByChapter(chapterId: string): Promise<QuestionEntity[]> {
    const isExisted = await this.chapterService.findOne(chapterId);
    const { questionIds } = isExisted;
    return await this.questionRepo.find({
      where: {
        id: {
          $in: questionIds,
        },
      },
    });
  }

  async findOne(id: string): Promise<QuestionEntity> {
    const isExisted = await this.questionRepo.findOneBy({ id });
    if (isExisted) return isExisted;
    throw new BusinessException(`400: Bản ghi ${id} không tồn tại`);
  }

  async findByContent(content: string): Promise<QuestionEntity> {
    const handleContent = content
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');
    const isExisted = await this.questionRepo.findOneBy({
      content: { $regex: handleContent, $options: 'i' },
    });
    if (isExisted) return isExisted;
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: QuestionEntity[] = [];
    const answerIds: string[] = [];

    await Promise.all(
      data.questions.map(async (questionData) => {
        // Kiểm tra chương
        await this.chapterService.findOne(questionData.chapterId);
        // Kiểm tra nếu tồn tại đáp án
        await this.answerService.findOne(questionData.correctAnswerId);
        // Kiểm tra nội dung đã tồn tại
        if (await this.findByContent(questionData.content))
          throw new BusinessException(
            `400:Nội dung câu hỏi "${questionData.content}" đã tồn tại`,
          );

        answerIds.push(...questionData.answerIds, questionData.correctAnswerId);
      }),
    );

    for (const answerId of answerIds) {
      await this.answerService.findOne(answerId);
    }

    await Promise.all(
      data.questions.map(async (questionData) => {
        const { answerIds, chapterId } = questionData;
        delete questionData.answerIds;

        const question = new QuestionEntity({
          ...questionData,
          answerIds: [...new Set(answerIds)],
          create_by: data.createBy,
          update_by: data.createBy,
        });
        // Cập nhật danh sách câu hỏi của chương
        const chapHasQuest = await this.chapterService.detailByLesson(
          chapterId,
          question.id,
        );
        !chapHasQuest &&
          (await this.chapterService.addQuestion(chapterId, question.id));

        questionsInfo.push(question);
      }),
    );

    const newQuestions = this.questionRepo.create(questionsInfo);

    return await this.questionRepo.save(newQuestions);
  }

  async questionHasAnswer(questId: string, answerId: string): Promise<boolean> {
    const isExisted = await this.questionRepo.findOneBy({
      id: questId,
      answerIds: {
        $all: [answerId],
      },
    });

    return !!isExisted;
  }

  async classifyByChapter(
    questions: QuestionEntity[],
  ): Promise<{ chapterId: string; questions: QuestionEntity[] }[]> {
    const detailChapters: { chapterId: string; questions: QuestionEntity[] }[] =
      [];

    questions.map((question) => {
      const indexChapter = detailChapters.findIndex(
        (detailChapter) => detailChapter.chapterId === question.chapterId,
      );

      if (indexChapter > -1) {
        detailChapters[indexChapter].questions.push(question);
      } else {
        detailChapters.push({
          chapterId: question.chapterId,
          questions: [question],
        });
      }
    });

    return detailChapters;
  }

  async classifyByLevel(data: IClassifyChapter[]): Promise<IClassifyLevel[]> {
    const levelClassification: IClassifyLevel[] = [];

    for (let i = 0; i < data.length; i++) {
      data[i].questions.map((question) => {
        const indexChapter = levelClassification.findIndex(
          (classifyLevel) => classifyLevel.chapterId === question.chapterId,
        );

        if (indexChapter > -1) {
          const indexLevel = levelClassification[indexChapter].info.findIndex(
            (classifyLevel) => classifyLevel.level === question.level,
          );

          if (indexLevel > -1) {
            levelClassification[indexChapter].info[indexLevel].questions.push(
              question,
            );
          } else {
            levelClassification[indexChapter].info.push({
              level: question.level,
              questions: [question],
            });
          }
        } else {
          levelClassification.push({
            chapterId: question.chapterId,
            info: [{ level: question.level, questions: [question] }],
          });
        }
      });
    }

    return levelClassification;
  }

  async questionPercentages(questions: QuestionEntity[]): Promise<IScale[]> {
    const chapterClassify = await this.classifyByChapter(questions);
    const levelClassify = await this.classifyByLevel(chapterClassify);
    const totalQuestions = questions.length;
    const scales: IScale[] = [];

    levelClassify.map(({ chapterId, info }) => {
      info.map(({ level, questions }) => {
        scales.push({
          chapterId,
          level,
          percent: Number(
            ((questions.length * 100) / totalQuestions).toFixed(2),
          ),
        });
      });
    });

    return scales;
  }

  async validateQuestions(
    lessonId: string,
    data: QuestionInfoDto,
  ): Promise<any> {
    const { chapterId, questionIds } = data;
    const questions: QuestionEntity[] = [];

    await Promise.all(
      questionIds.map(async (id) => questions.push(await this.findOne(id))),
    );

    return await this.chapterService.validateQuestions(
      lessonId,
      questions,
      chapterId,
    );
  }

  async findByAnswerId(answerId: string): Promise<QuestionEntity[]> {
    return await this.questionRepo.find({
      where: {
        answerIds: {
          $all: [answerId],
        },
      },
    });
  }

  async update(id: string, data: UpdateQuestionDto): Promise<QuestionEntity> {
    const isExisted = await this.findOne(id);
    const listAnswers: string[] = [];

    if (data.content) {
      const isContent = await this.findByContent(data.content);
      if (isContent.id !== id)
        throw new BusinessException('400:Nội dung câu hỏi đã tồn tại');
    }

    data.chapterId && (await this.chapterService.findOne(data.chapterId));
    data.correctAnswerId &&
      (await this.answerService.findOne(data.correctAnswerId));

    if (data.answerIds) {
      await Promise.all(
        data.answerIds.map(async (answerId) => {
          await this.answerService.findOne(answerId);
          if (!(await this.questionHasAnswer(id, answerId))) {
            const index = listAnswers.findIndex((isId) => answerId === isId);
            index === -1 && listAnswers.push(answerId);
          }
        }),
      );
    }

    const { affected } = await this.questionRepo.update(
      { id },
      {
        // ...(data.label && { label: data.label }),
        ...(data.content && { content: data.content }),
        ...(data.chapterId && { chapterId: data.chapterId }),
        ...(data.level && { level: data.level }),
        ...(data.status && { status: data.status }),
        ...(data.category && { category: data.category }),
        ...(listAnswers.length > 0 && { answerIds: listAnswers }),
        ...(!_.isNil(data?.enable) && { enable: data.enable }),
        update_by: data.updateBy,
      },
    );
    return affected ? await this.findOne(id) : isExisted;
  }

  async updateStatus(data: UpdateQuestionStatusDto): Promise<string> {
    await Promise.all(
      data.questionsStatus.map(async ({ questionId }) => {
        await this.findOne(questionId);
      }),
    );

    await Promise.all(
      data.questionsStatus.map(async ({ questionId, status }) => {
        await this.questionRepo.update(
          { id: questionId },
          { status, update_by: data.updateBy },
        );
      }),
    );

    return 'Cập nhật thành công!';
  }

  async updateChaptersStatus(data: UpdateChaptersStatusDto): Promise<string> {
    await Promise.all(
      data.chaptersStatus.map(async ({ chapterId, status }) => {
        const questionIds = (await this.findByChapter(chapterId)).map(
          ({ id }) => id,
        );
        await this.questionRepo.updateMany(
          { id: { $in: questionIds } },
          { $set: { status } },
          { upsert: false },
        );
      }),
    );
    return await this.chapterService.updateStatus(data);
  }

  async deleteMany(ids: string[]): Promise<string> {
    const listIds: string[] = [];
    await Promise.all(
      ids.map(async (id) => {
        await this.findOne(id);
        const index = listIds.findIndex((questId) => questId === id);
        index === -1 && listIds.push(id);
      }),
    );

    await this.questionRepo.deleteMany({ id: { $in: listIds } });
    return 'Xóa thành công!';
  }

  async deleteAnswers(answerIds: string[]): Promise<string> {
    const listIds = [];
    await Promise.all(
      answerIds.map(async (id) => {
        const isExisted = await this.findByAnswerId(id);
        if (isExisted.length === 0) listIds.push(id);
      }),
    );
    if (listIds.length === 0)
      throw new BusinessException(ErrorEnum.RECORD_IN_USED);
    return await this.answerService.deleteMany(listIds);
  }

  async randQuestsByChap(
    chapterId: string,
    level: LevelEnum,
    quantity: number,
  ): Promise<IDetailChapter> {
    const chapter = await this.chapterService.findAvailableById(chapterId);
    const questions = await this.questionRepo
      .aggregate([
        {
          $match: {
            chapterId: chapter.id,
            level: level,
          },
        },
        { $sample: { size: quantity } },
      ])
      .toArray();

    return { chapter, questions };
  }

  async shuffle(arr: any[]): Promise<any[]> {
    let i = arr.length;
    let j;
    let temp;

    while (--i > 0) {
      j = Math.floor(Math.random() * (i + 1));
      temp = arr[j];
      arr[j] = arr[i];
      arr[i] = temp;
    }

    return arr;
  }

  async randomQuestions(
    questions: QuestionEntity[],
    quantity: number = questions.length,
  ): Promise<QuestionEntity[]> {
    const handleQuestions: QuestionEntity[] = await this.shuffle(questions);

    await Promise.all(
      questions.map(async ({ id, answerIds }) => {
        const handleAnswers = await this.shuffle(answerIds);
        const index = handleQuestions.findIndex((quest) => quest.id === id);
        handleQuestions[index].answerIds = handleAnswers;
      }),
    );

    return handleQuestions.slice(0, quantity);
  }
}
