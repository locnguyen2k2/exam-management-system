import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { MongoRepository } from 'typeorm';
import {
  CorrectAnswerIdsDto,
  CreateQuestionsDto,
  EnableQuestionsDto,
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
import { pipeLine } from '~/utils/pipe-line';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { ImageService } from '~/modules/system/image/image.service';
import * as _ from 'lodash';
import { ExamService } from '~/modules/system/exam/exam.service';

export interface IClassifyQuestion {
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
        $or: [{ create_by: uid }],
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
        const correctAnswerList = await this.detailCorrectAnswers(
          question.correctAnswerIds,
        );
        // for (const correctAnswer of question.correctAnswerIds) {
        //   const correctAnswerEntity = {
        //     score: correctAnswer.score,
        //     ...(await this.answerService.findOne(
        //       correctAnswer.correctAnswerId,
        //     )),
        //   };
        //
        //   correctAnswerList.push(correctAnswerEntity);
        // }

        delete question.correctAnswerIds;
        if (correctAnswerList.length > 0) {
          question['correctAnswers'] = correctAnswerList;
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

  async detailQuestion(id: string, uid: string): Promise<any> {
    const isExisted = await this.questionRepo
      .aggregate([...defaultLookup, { $match: { id } }])
      .toArray();

    if (isExisted.length > 0 && isExisted[0].create_by === uid) {
      const correctAnswerList = await this.detailCorrectAnswers(
        isExisted[0].correctAnswerIds,
      );
      // if (isExisted[0].correctAnswerIds.length > 0) {
      //   for (const correctAnswer of isExisted[0].correctAnswerIds) {
      //     const newCorrectAnswer = {
      //       score: correctAnswer.score,
      //       ...(!_.isEmpty(correctAnswer.correctAnswerId) &&
      //         (await this.answerService.findOne(
      //           correctAnswer.correctAnswerId,
      //         ))),
      //     };
      //     correctAnswerList.push(newCorrectAnswer);
      //   }
      // }
      if (correctAnswerList.length > 0) {
        isExisted[0]['correctAnswers'] = correctAnswerList;
        delete isExisted[0].correctAnswerIds;
      }
      return isExisted[0];
    }
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async findByChapter(chapterId: string): Promise<QuestionEntity[]> {
    return await this.questionRepo.find({
      where: { 'chapter.id': chapterId },
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

  async findAvailable(id: string, uid: string): Promise<QuestionEntity> {
    const isExisted = await this.findOne(id);
    if (isExisted.create_by === uid) return isExisted;

    throw new BusinessException(`400:Bản ghi "${isExisted.id}" không có sẵn!`);
  }

  async beforeAddQuestion(data: any) {
    const listQuestion: any[] = [];
    await Promise.all(
      data.questions.map(async (questionData: any) => {
        await this.chapterService.findAvailableById(
          questionData.chapterId,
          data.createBy,
        );

        const isExisted = await this.findByContent(questionData.content);
        if (isExisted && isExisted.create_by === data.createBy)
          throw new BusinessException(
            `400:Nội dung câu hỏi "${questionData.content}" đã tồn tại`,
          );

        if (
          questionData.category !== CategoryEnum.MULTIPLE_CHOICE &&
          questionData.correctAnswers.length > 1
        ) {
          throw new BusinessException(
            '400:Ngoài trắc nghiệm nhiều lựa chọn, tất cả câu hỏi khác chỉ có 1 đáp án!',
          );
        }

        if (
          listQuestion.find(
            (quest: any) =>
              quest.content.toLowerCase().replace(/\s/g, '') ===
              questionData.content.toLowerCase().replace(/\s/g, ''),
          )
        ) {
          throw new BusinessException(
            `400:Nội dung câu hỏi ${questionData.content} bị trùng!`,
          );
        }

        listQuestion.push(questionData);
      }),
    );
  }

  async detailCorrectAnswers(correctAnswers: any[]): Promise<any> {
    const listCorrectAnswer = [];

    for (const correctAnswer of correctAnswers) {
      const correctAnswerEntity = {
        score: correctAnswer.score,
        ...(await this.answerService.findOne(correctAnswer.correctAnswerId)),
      };

      listCorrectAnswer.push(correctAnswerEntity);
    }

    return listCorrectAnswer;
  }

  async handleAnswers(data: any): Promise<any> {
    const questionData = data.questionData;
    const answerIds: string[] = [];
    const correctAnswers: CorrectAnswerIdsDto[] = [];

    for (const answerId of questionData.answerIds) {
      const index = answerIds.findIndex((value) => value === answerId);
      if (index === -1) {
        await this.answerService.findAvailableById(answerId, data.createBy);
        answerIds.push(answerId);
      }
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
        correctAnswers.push(correctAnswer);
      }
    }

    return { answerIds, correctAnswers };
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: QuestionEntity[] = [];

    // Kiểm tra chương, nội dung câu hỏi
    await this.beforeAddQuestion(data);

    await Promise.all(
      data.questions.map(async (questionData, index) => {
        const { answerIds, correctAnswers } = await this.handleAnswers({
          createBy: data.createBy,
          questionData,
        });
        data.questions[index].answerIds = answerIds;
        data.questions[index].correctAnswers = correctAnswers;
      }),
    );

    await Promise.all(
      data.questions.map(async (questionData) => {
        const { answerIds, chapterId, correctAnswers } = questionData;
        let picture = '';
        const chapter = await this.chapterService.findAvailableChapterById(
          chapterId,
          data.createBy,
        );
        delete questionData.answerIds;
        delete questionData.chapterId;
        delete questionData.correctAnswers;

        if (questionData.picture) {
          picture += await this.imageService.uploadImage(questionData.picture);
        }

        const question = new QuestionEntity({
          ...questionData,
          chapter,
          correctAnswerIds: [...new Set(correctAnswers)],
          answerIds: [...new Set(answerIds)],
          picture,
          create_by: data.createBy,
          update_by: data.createBy,
        });

        questionsInfo.push(question);
      }),
    );

    const newQuestions = this.questionRepo.create(questionsInfo);

    return await this.questionRepo.save(newQuestions);
  }

  // Phân loại danh sách câu hỏi
  async classifyQuestions(
    data: QuestionEntity[],
  ): Promise<IClassifyQuestion[]> {
    const levelClassification: IClassifyQuestion[] = [];

    data.map((question) => {
      const indexChapter = levelClassification.findIndex(
        (classifyLevel) => classifyLevel.chapterId === question.chapter.id,
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
          chapterId: question.chapter.id,
          info: [{ level: question.level, questions: [question] }],
        });
      }
    });

    return levelClassification;
  }

  async getQuestionRate(questions: QuestionEntity[]): Promise<IScale[]> {
    const classifyQuestions = await this.classifyQuestions(questions);
    const totalQuestions = questions.length;
    const scales: IScale[] = [];

    classifyQuestions.map(({ chapterId, info }) => {
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
    const chapter = await this.chapterService.findAvailableChapterById(
      chapterId,
      uid,
    );

    await Promise.all(
      questionIds.map(async (id) => {
        const question = await this.findAvailable(id, uid);
        if (question.chapter.id !== chapterId)
          throw new BusinessException(
            `400:Câu hỏi ${id} không có trong chương ${chapterId}`,
          );

        if (!(await this.chapterService.lessonHasChapter(lessonId, chapterId)))
          throw new BusinessException(
            `400:Học phần ${lessonId} không có ${chapterId}`,
          );

        questions.push(question);
      }),
    );

    return { chapter, questions };
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
    const isExisted = await this.findAvailable(id, data.updateBy);
    let chapter = null;

    const listAnswers: string[] = [];
    const correctAnswers: CorrectAnswerIdsDto[] = [];
    let picture = '';

    if (data.content) {
      const isReplaced = await this.findByContent(data.content);
      if (isReplaced.id !== id && isReplaced.create_by === data.updateBy)
        throw new BusinessException('400:Nội dung câu hỏi đã tồn tại');
    }

    if (data.chapterId) {
      chapter = await this.chapterService.findAvailableById(
        data.chapterId,
        data.updateBy,
      );
    }

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
        ...(data.chapterId && { chapter }),
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

  async enableQuestions(data: EnableQuestionsDto): Promise<QuestionEntity[]> {
    const listQuestions: QuestionEntity[] = [];
    await Promise.all(
      data.questionsEnable.map(async (questionEnable: any) => {
        const isExisted = await this.findOne(questionEnable.questionId);
        if (isExisted) {
          if (isExisted.create_by !== data.updateBy) {
            throw new BusinessException(
              '400:Không có quyền thao tác trên bản ghi này!',
            );
          }
          isExisted.enable = questionEnable.enable;
          listQuestions.push(isExisted);
        }
      }),
    );

    await Promise.all(
      data.questionsEnable.map(async ({ questionId, enable }) => {
        await this.questionRepo.update(
          { id: questionId },
          { enable, update_by: data.updateBy },
        );
      }),
    );

    return listQuestions;
  }

  async updateStatus(data: UpdateQuestionStatusDto): Promise<string> {
    await Promise.all(
      data.questionsStatus.map(async ({ questionId }) => {
        const isExisted = await this.findOne(questionId);
        if (isExisted.create_by !== data.updateBy) {
          throw new BusinessException(
            '400:Không có quyền thao tác trên bản ghi này!',
          );
        }
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
        if (isExisted.length === 0) listQuestion.push(id);
      }),
    );

    if (listQuestion.length === 0)
      throw new BusinessException(ErrorEnum.RECORD_IN_USED);

    await this.questionRepo.deleteMany({ id: { $in: listQuestion } });
    throw new BusinessException('200:Xoá thành công!');
  }

  async randQuestsByScales(
    scales: IScale[],
    totalQuestions: number,
    uid: string,
  ) {
    return await Promise.all(
      scales.map(async (scale) => {
        const { chapterId, percent, level } = scale;
        const questionQty = (percent * totalQuestions) / 100;
        // Lấy ngẫu nhiên câu hỏi trong chương theo số lượng
        const { questions, chapter } = await this.randQuestsByChap(
          chapterId,
          level,
          questionQty,
          uid,
        );

        if (questions.length - questionQty < 0)
          throw new BusinessException(
            `400:Tỉ lệ câu hỏi chuong ${chapter.id} không hợp lệ(${questions.length}/${questionQty}) câu ${LevelEnum[`${level.toUpperCase()}`]}`,
          );

        return {
          id: chapter.id,
          name: chapter.name,
          questions,
        };
      }),
    );
  }

  async randQuestsByChap(
    chapterId: string,
    level: LevelEnum,
    quantity: number,
    uid: string,
  ): Promise<IDetailChapter> {
    const chapter = await this.chapterService.findAvailableById(chapterId, uid);
    const questions = await this.questionRepo
      .aggregate([
        {
          $match: {
            'chapter.id': chapter.id,
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
