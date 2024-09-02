import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { MongoRepository } from 'typeorm';
import {
  CorrectAnswerIdsDto,
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
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { QuestionPagination } from '~/modules/system/question/dtos/question-res.dto';
import { searchIndexes } from '~/utils/search';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { IDetailChapter } from '~/modules/system/chapter/chapter.interface';
import { QuestionInfoDto } from '~/modules/system/exam/dtos/exam-req.dto.';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { pipeLine } from '~/utils/pagination';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { ImageService } from '~/modules/system/image/image.service';
import * as _ from 'lodash';
import { ExamService } from '~/modules/system/exam/exam.service';

export interface IClassifyChapter {
  chapterId: string;
  questions: QuestionEntity[];
}

export interface IClassifyLevel {
  chapterId: string;
  info: { level: LevelEnum; questions: QuestionEntity[] }[];
}

const defaultLookup = [
  {
    $lookup: {
      from: 'answer_entity',
      localField: 'answerIds',
      foreignField: 'id',
      as: 'answers',
    },
  },
  {
    $addFields: {
      chapter: { $arrayElemAt: ['$chapter', 0] }, // Ensure only one item in array
    },
  },
];

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: MongoRepository<QuestionEntity>,
    @Inject(forwardRef(() => ExamService))
    private readonly examService: ExamService,
    private readonly answerService: AnswerService,
    private readonly chapterService: ChapterService,
    private readonly imageService: ImageService,
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
      ...(uid && {
        $or: [
          { status: StatusShareEnum.PUBLIC },
          { enable: true },
          { enable: false, create_by: uid },
          {
            status: StatusShareEnum.PRIVATE,
            create_by: uid,
          },
        ],
      }),
    };

    const pipes = [
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions, defaultLookup),
    ];

    const [{ data, pageInfo }]: any[] = await this.questionRepo
      .aggregate(pipes)
      .toArray();

    if (data.length > 0) {
      for (const question of data) {
        const correctAnswerList = [];
        for (const correctAnswer of question.correctAnswerIds) {
          const newCorrectAnswer = {
            score: correctAnswer.score,
            ...(!_.isEmpty(correctAnswer.correctAnswerId) &&
              (await this.answerService.findOne(
                correctAnswer.correctAnswerId,
              ))),
          };
          correctAnswerList.push(newCorrectAnswer);
        }

        if (correctAnswerList.length > 0) {
          question['correctAnswers'] = correctAnswerList;
          delete question.correctAnswerIds;
        }
      }
    }

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
      .aggregate([...defaultLookup, { $match: { id } }])
      .toArray();

    if (isExisted.length > 0) {
      const correctAnswerList = [];
      if (isExisted[0].correctAnswerIds.length > 0) {
        for (const correctAnswer of isExisted[0].correctAnswerIds) {
          const newCorrectAnswer = {
            score: correctAnswer.score,
            ...(!_.isEmpty(correctAnswer.correctAnswerId) &&
              (await this.answerService.findOne(
                correctAnswer.correctAnswerId,
              ))),
          };
          correctAnswerList.push(newCorrectAnswer);
        }
      }
      if (correctAnswerList.length > 0) {
        isExisted[0]['correctAnswers'] = correctAnswerList;
        delete isExisted[0].correctAnswerIds;
      }
      return isExisted[0];
    }
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

  async getAvailable(id: string, uid: string): Promise<QuestionEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted.create_by === uid) return isExisted;

    if (
      isExisted.status === StatusShareEnum.PUBLIC &&
      isExisted.enable === true
    )
      return isExisted;

    throw new BusinessException(`400:Bản ghi "${isExisted.id}" không có sẵn!`);
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: QuestionEntity[] = [];
    const answerIds: string[] = [];
    const correctAnswers: CorrectAnswerIdsDto[] = [];

    await Promise.all(
      data.questions.map(async (questionData) => {
        // Kiểm tra chương
        await this.chapterService.findOne(questionData.chapterId);
        // Kiểm tra nội dung đã tồn tại
        if (await this.findByContent(questionData.content))
          throw new BusinessException(
            `400:Nội dung câu hỏi "${questionData.content}" đã tồn tại`,
          );

        for (const answerId of questionData.answerIds) {
          const index = answerIds.findIndex((value) => value === answerId);
          if (index === -1) {
            await this.answerService.findOne(answerId);
            answerIds.push(answerId);
          }
        }

        if (
          questionData.category !== CategoryEnum.MULTIPLE_CHOICE &&
          questionData.correctAnswers.length > 1
        ) {
          throw new BusinessException(
            '400:Ngoài trắc nghiệm nhiều lựa chọn, tất cả câu hỏi khác chỉ có 1 đáp án!',
          );
        }

        for (const correctAnswer of questionData.correctAnswers) {
          const index = correctAnswers.findIndex(
            (value) => value.correctAnswerId === correctAnswer.correctAnswerId,
          );
          const hasInAnswerIds = answerIds.find(
            (value) => value === correctAnswer.correctAnswerId,
          );

          if (!hasInAnswerIds)
            throw new BusinessException(
              '400:Đáp án phải đúng có trong câu trả lời',
            );
          if (index === -1) {
            await this.answerService.findOne(correctAnswer.correctAnswerId);
            correctAnswers.push(correctAnswer);
          }
        }
      }),
    );

    await Promise.all(
      data.questions.map(async (questionData) => {
        const { answerIds, chapterId } = questionData;
        let picture = '';
        delete questionData.answerIds;
        delete questionData.correctAnswers;

        if (questionData.picture) {
          picture += await this.imageService.uploadImage(questionData.picture);
        }

        const question = new QuestionEntity({
          ...questionData,
          correctAnswerIds: [...new Set(correctAnswers)],
          answerIds: [...new Set(answerIds)],
          picture,
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
    uid: string,
  ): Promise<any> {
    const { chapterId, questionIds } = data;
    const questions: QuestionEntity[] = [];

    await Promise.all(
      questionIds.map(async (id) =>
        questions.push(await this.getAvailable(id, uid)),
      ),
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

    if (isExisted.create_by !== data.updateBy)
      throw new BusinessException('400:Khong co quyen cap nhat ban ghi nay!');

    const listAnswers: string[] = [];
    const correctAnswers: CorrectAnswerIdsDto[] = [];
    let picture = '';

    if (data.content) {
      const isContent = await this.findByContent(data.content);
      if (isContent.id !== id)
        throw new BusinessException('400:Nội dung câu hỏi đã tồn tại');
    }

    data.chapterId && (await this.chapterService.findOne(data.chapterId));

    const category = data.category ? data.category : isExisted.category;

    if (
      category !== CategoryEnum.MULTIPLE_CHOICE &&
      ((data.correctAnswers && data.correctAnswers.length > 1) ||
        isExisted.correctAnswerIds.length > 1)
    ) {
      throw new BusinessException(
        '400:Ngoài trắc nghiệm nhiều đáp án, các câu hỏi khác chỉ có 1 đáp án',
      );
    }

    if (data.answerIds) {
      for (const answerId of data.answerIds) {
        await this.answerService.findOne(answerId);
        const index = listAnswers.findIndex((value) => answerId === value);
        index === -1 && listAnswers.push(answerId);
      }
    }

    if (data.correctAnswers) {
      const answers =
        listAnswers.length > 0 ? listAnswers : isExisted.answerIds;

      for (const correctAnswer of data.correctAnswers) {
        const hasInAnswers = answers.find(
          (value) => value === correctAnswer.correctAnswerId,
        );

        if (!hasInAnswers) {
          throw new BusinessException(
            '400:Đáp án phải có trong danh sách câu trả lời!',
          );
        }

        const index = correctAnswers.findIndex(
          (value) => value.correctAnswerId === correctAnswer.correctAnswerId,
        );

        if (index === -1) {
          await this.answerService.findOne(correctAnswer.correctAnswerId);
          correctAnswers.push({
            correctAnswerId: correctAnswer.correctAnswerId,
            score: correctAnswer.score,
          });
        }
      }
    }

    if (data.picture) {
      if (!_.isEmpty(isExisted.picture)) {
        await this.imageService.deleteImage(isExisted.picture);
      }
      picture += await this.imageService.uploadImage(data.picture);
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
        ...(correctAnswers.length > 0 && { correctAnswerIds: correctAnswers }),
        ...(listAnswers.length > 0 && { answerIds: listAnswers }),
        ...(!_.isEmpty(picture) && { picture: picture }),
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

  async deleteMany(ids: string[]): Promise<string> {
    const listQuestion: string[] = [];
    const listIds: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        await this.findOne(id);
        const index = listIds.findIndex((questId) => questId === id);
        index === -1 && listIds.push(id);
      }),
    );

    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.examService.findByQuestionId(id);
        const questInChapters =
          await this.chapterService.isQuestionInChapters(id);
        if (isExisted.length === 0 && !questInChapters) listQuestion.push(id);
      }),
    );

    if (listQuestion.length === 0)
      throw new BusinessException(ErrorEnum.RECORD_IN_USED);

    await this.questionRepo.deleteMany({ id: { $in: listQuestion } });
    throw new BusinessException('200:Xoá thành công!');
  }

  async randQuestsByChap(
    chapterId: string,
    level: LevelEnum,
    quantity: number,
    uid: string,
  ): Promise<IDetailChapter> {
    const chapter = await this.chapterService.findAvailableById(chapterId);
    const questions = await this.questionRepo
      .aggregate([
        {
          $match: {
            chapterId: chapter.id,
            level: level,
            create_by: uid,
          },
        },
        { $sample: { size: quantity } },
      ])
      .toArray();

    return { chapter, questions };
  }

  async shuffle(arr: any[]): Promise<any[]> {
    let i = arr.length;
    let j: any;
    let temp: any;

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
