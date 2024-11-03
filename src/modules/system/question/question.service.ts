import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateQuestionsDto,
  EnableQuestionsDto,
  QuestionPageOptions,
  UpdateQuestionDto,
  UpdateQuestionStatusDto,
} from '~/modules/system/question/dtos/question-req.dto';
// import { AnswerService } from '~/modules/system/answer/answer.service';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { IDetailChapter } from '~/modules/system/chapter/chapter.interface';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { ImageService } from '~/modules/system/image/image.service';
import * as _ from 'lodash';
import { ExamService } from '~/modules/system/exam/exam.service';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { factorial } from '~/utils/factorial';
import { AnswerBaseDto } from '~/modules/system/answer/dtos/answer-req.dto';
import { v4 as uuid } from 'uuid';
import { shuffle } from '~/utils/shuffle';

export interface IClassifyQuestion {
  chapterId: string;
  info: { level: LevelEnum; questions: QuestionEntity[] }[];
}

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: MongoRepository<QuestionEntity>,
    @Inject(forwardRef(() => ExamService))
    private readonly examService: ExamService,
    // private readonly answerService: AnswerService,
    private readonly chapterService: ChapterService,
    private readonly imageService: ImageService,
  ) {}

  async findAll(
    uid: string,
    chapterId: string,
    pageOptions: QuestionPageOptions = new QuestionPageOptions(),
  ) {
    const paginated = await this.chapterService.findQuizzes(
      chapterId,
      pageOptions,
      uid,
    );

    return {
      data: paginated.data[0] ? paginated.data[0].questions : [],
      meta: paginated.meta,
    };
  }

  async detailQuestion(id: string, uid: string): Promise<QuestionEntity> {
    const isExisted = await this.findOne(id, uid);

    if (isExisted) {
      return isExisted;
    }
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async findByChapter(chapterId: string): Promise<QuestionEntity[]> {
    return await this.questionRepo.find({
      where: { 'chapter.id': chapterId },
    });
  }

  async findOne(id: string, uid: string): Promise<QuestionEntity> {
    const { question } = await this.chapterService.getQuiz(id, uid);
    if (question) return question;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async isReplacedContent(
    content: string,
    uid: string,
  ): Promise<QuestionEntity> {
    const handleContent = content
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');

    const isExisted = await this.questionRepo.findOneBy({
      content: { $regex: handleContent, $options: 'i' },
    });

    if (isExisted && isExisted.create_by === uid)
      throw new BusinessException(ErrorEnum.RECORD_EXISTED, content);

    if (isExisted) return isExisted;
  }

  async beforeAddQuestion(data: any) {
    const listQuestion = [];

    await this.chapterService.findAvailable(data.chapterId, data.createBy);

    const isReplaced = await this.chapterService.findByQuizContent(
      data.content,
    );

    if (isReplaced && isReplaced.id === data.chapterId)
      throw new BusinessException(ErrorEnum.RECORD_EXISTED, `${data.content}`);

    const countCorrectAnswers = data.answers.filter(
      (answer: AnswerEntity) => answer.isCorrect,
    );

    if (
      data.category !== CategoryEnum.MULTIPLE_CHOICE &&
      countCorrectAnswers.length > 1
    ) {
      throw new BusinessException(
        '400:Ngoài trắc nghiệm nhiều lựa chọn, tất cả câu hỏi khác chỉ có 1 đáp án đúng (isCorrect = true)!',
      );
    }

    if (
      listQuestion.find(
        (quest: any) =>
          quest.content.toLowerCase().replace(/\s/g, '') ===
          data.content.toLowerCase().replace(/\s/g, ''),
      )
    ) {
      throw new BusinessException(
        `400:Nội dung câu hỏi ${data.content} bị trùng!`,
      );
    }

    listQuestion.push(data);
  }

  classifyAnswers(answers: any): {
    wrongAnswers: AnswerBaseDto[];
    correctAnswers: AnswerBaseDto[];
  } {
    const wrongAnswers: AnswerBaseDto[] = [];
    const correctAnswers: AnswerBaseDto[] = [];

    for (const answer of answers) {
      if (answer.isCorrect) {
        if (_.isNil(answer.score)) {
          throw new BusinessException('400:Đáp án đúng phải có điểm');
        }

        const isReplaced = correctAnswers.find(
          (correctAnswer) => correctAnswer.value === answer.value,
        );

        if (!isReplaced) {
          correctAnswers.push({ ...answer, id: uuid() });
        }
      } else {
        const isReplaced = wrongAnswers.find(
          (wrongAnswer) => wrongAnswer.value === answer.value,
        );

        if (!isReplaced) {
          wrongAnswers.push(answer);
        }
      }
    }

    return { wrongAnswers, correctAnswers };
  }

  maxFillInAnswers(correctAnswer: AnswerBaseDto): number {
    const listCorrectValue = this.handleFillInAnswerValue(correctAnswer.value);
    const total = listCorrectValue.length;
    return factorial(total) / factorial(total - total);
  }

  handleFillInAnswerValue(value: string): string[] {
    const listValue = value.split('[__]');
    let isDeleted = 0;
    for (let i = listValue.length - 1; i >= 0; i--) {
      if (_.isEmpty(listValue[i])) {
        if (isDeleted === 0) {
          isDeleted += 1;
          listValue.splice(i, 1);
        } else {
          throw new BusinessException(
            '400:Giữa 2 ký hiệu của đáp án [__][__] phải có giá trị!',
          );
        }
      }
    }

    return listValue;
  }

  handleFillInContent(content: string): number {
    const listValue = content.split('[__]');
    if (listValue.length === 0)
      throw new BusinessException(
        '400:Nội dung phải có ít nhất 1 ô trống ([__])',
      );
    return listValue.length - 1;
  }

  randFillInWrongAnswers(quantity: number, correctAnswer: AnswerBaseDto) {
    if (quantity > this.maxFillInAnswers(correctAnswer) - 1)
      throw new BusinessException(
        `400:${this.maxFillInAnswers(correctAnswer) - 1} là số đáp án nhiễu tối đa`,
      );

    const listAnswers: any[] = [];
    const listCorrectValue = this.handleFillInAnswerValue(correctAnswer.value);

    while (listAnswers.length < quantity) {
      const shuffledValues = shuffle(listCorrectValue);
      const wrongValue = shuffledValues.reduce(
        (acc: string, curr: string) => acc + `${curr}[__]`,
        '',
      );

      const isDuplicate = listAnswers.some(
        (answer) => answer.value === wrongValue,
      );

      if (!isDuplicate && wrongValue !== correctAnswer.value) {
        listAnswers.push({
          isCorrect: false,
          enable: correctAnswer.enable,
          value: wrongValue,
          remark: null,
          score: null,
        });
      }
    }

    return { correctAnswers: [correctAnswer], wrongAnswers: listAnswers };
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: { chapterId: string; question: QuestionEntity }[] = [];

    // Kiểm tra câu hỏi
    await Promise.all(
      data.questions.map(
        async (questionData: any) =>
          await this.beforeAddQuestion({
            ...questionData,
            createBy: data.createBy,
          }),
      ),
    );

    await Promise.all(
      data.questions.map(async (questionData, index) => {
        let answers = this.classifyAnswers(questionData.answers);

        if (answers.correctAnswers.length === 0)
          throw new BusinessException('400:Phải có ít nhất 1 đáp án đúng!');

        if (questionData.category === CategoryEnum.FILL_IN) {
          const quantityValue = this.handleFillInContent(questionData.content);

          if (!_.isNil(questionData.quantityWrongAnswers)) {
            if (
              answers.correctAnswers[0].value.startsWith('[__]') ||
              !answers.correctAnswers[0].value.endsWith('[__]')
            )
              throw new BusinessException(
                '400:Đáp án đúng câu hỏi điền khuyết không bắt đầu bằng [__] hoặc kết thúc khác [__]',
              );

            if (
              quantityValue !==
              this.handleFillInAnswerValue(answers.correctAnswers[0].value)
                .length
            ) {
              throw new BusinessException(
                `400:Đáp án không được quá ${quantityValue} giá trị ([__])!`,
              );
            }

            answers = this.randFillInWrongAnswers(
              questionData.quantityWrongAnswers,
              answers.correctAnswers[0],
            );
          } else {
            if (
              answers.wrongAnswers.length >
              this.maxFillInAnswers(answers.correctAnswers[0])
            ) {
              throw new BusinessException(
                `400:${this.maxFillInAnswers(answers.correctAnswers[0])} là số đáp án tối đa`,
              );
            }
          }
        }

        data.questions[index].answers = [
          ...answers.correctAnswers,
          ...answers.wrongAnswers,
        ];
      }),
    );

    await Promise.all(
      data.questions.map(async (questionData) => {
        const { answers, chapterId } = questionData;
        const answerEntitties = answers.map(
          (answer) => new AnswerEntity({ ...answer }),
        );
        let picture = '';

        if (questionData.picture) {
          picture += await this.imageService.uploadImage(questionData.picture);
        }

        const initial = new QuestionEntity({
          ...questionData,
          answers: [...new Set(answerEntitties)],
          ...(!_.isEmpty(questionData.picture) && { picture: picture }),
          create_by: data.createBy,
          update_by: data.createBy,
        });

        const question = this.questionRepo.create(initial);

        questionsInfo.push({ chapterId, question });
      }),
    );

    await Promise.all(
      questionsInfo.map(
        async ({ chapterId, question }) =>
          await this.chapterService.addQuizzes(chapterId, [question]),
      ),
    );

    return questionsInfo.map(({ question }) => question);
  }

  // async validateQuestions(
  //   lessonId: string,
  //   data: QuestionInfoDto,
  //   uid: string,
  // ): Promise<any> {
  //   const { chapterId, questionIds } = data;
  //   const questions: QuestionEntity[] = [];
  //   const chapter = await this.chapterService.findAvailableChapterById(
  //     chapterId,
  //     uid,
  //   );
  //
  //   await Promise.all(
  //     questionIds.map(async (id) => {
  //       const question = await this.findAvailable(id, uid);
  //       if (question.chapter.id !== chapterId)
  //         throw new BusinessException(
  //           `400:Câu hỏi ${id} không có trong chương ${chapterId}`,
  //         );
  //
  //       if (!(await this.chapterService.lessonHasChapter(lessonId, chapterId)))
  //         throw new BusinessException(
  //           `400:Học phần ${lessonId} không có ${chapterId}`,
  //         );
  //
  //       questions.push(question);
  //     }),
  //   );
  //
  //   return { chapter, questions };
  // }

  async update(id: string, data: UpdateQuestionDto): Promise<QuestionEntity> {
    let picture = '';
    let newQuestions = [];
    let oldQuestions = [];
    const { chapterId, question } = await this.chapterService.getQuiz(
      id,
      data.updateBy,
    );
    const newQuestion = question;

    if (!_.isEmpty(data.chapterId) && chapterId !== data.chapterId) {
      const newChapter = await this.chapterService.findAvailable(
        data.chapterId,
        data.updateBy,
      );
      const oldChapter = await this.chapterService.findAvailable(
        chapterId,
        data.updateBy,
      );

      oldQuestions = oldChapter.questions.filter((question) => {
        if (question.id !== id) return question;
      });
      newQuestions = newChapter.questions.filter((question) => question);
    }

    // if (data.content) {
    //   const isReplaced = await this.chapterService.findByQuizContent(
    //     data.content,
    //   );
    //
    //   if (
    //     isReplaced &&
    //     isReplaced.id !== isExisted.chapterId &&
    //     isReplaced.create_by === isExisted.question.create_by
    //   ) {
    //     throw new BusinessException(
    //       ErrorEnum.RECORD_EXISTED,
    //       `${data.content}`,
    //     );
    //   }
    // }
    // const category = data.category ? data.category : isExisted.category;

    // if (
    //   category !== CategoryEnum.MULTIPLE_CHOICE &&
    //   ((data.correctAnswers && data.correctAnswers.length > 1) ||
    //     isExisted.correctAnswerIds.length > 1)
    // ) {
    //   throw new BusinessException(
    //     '400:Ngoài trắc nghiệm nhiều đáp án, các câu hỏi khác chỉ có 1 đáp án',
    //   );
    // }

    // if (data.answerIds) {
    //   for (const answerId of data.answerIds) {
    //     await this.answerService.findOne(answerId);
    //     const index = listAnswers.findIndex((value) => answerId === value);
    //     index === -1 && listAnswers.push(answerId);
    //   }
    // }

    // if (data.correctAnswers) {
    //   const answers =
    //     listAnswers.length > 0 ? listAnswers : isExisted.answerIds;
    //
    //   for (const correctAnswer of data.correctAnswers) {
    //     const hasInAnswers = answers.find(
    //       (value) => value === correctAnswer.correctAnswerId,
    //     );
    //
    //     if (!hasInAnswers) {
    //       throw new BusinessException(
    //         '400:Đáp án phải có trong danh sách câu trả lời!',
    //       );
    //     }
    //
    //     const index = correctAnswers.findIndex(
    //       (value) => value.correctAnswerId === correctAnswer.correctAnswerId,
    //     );
    //
    //     if (index === -1) {
    //       await this.answerService.findOne(correctAnswer.correctAnswerId);
    //       correctAnswers.push({
    //         correctAnswerId: correctAnswer.correctAnswerId,
    //         score: correctAnswer.score,
    //       });
    //     }
    //   }
    // }

    if (data.picture) {
      if (!_.isEmpty(question.picture)) {
        await this.imageService.deleteImage(question.picture);
      }
      picture += await this.imageService.uploadImage(data.picture);
    }

    newQuestion.update_by = data.updateBy;
    if (!_.isEmpty(data.content)) newQuestion.content = data.content;
    if (data.level) newQuestion.level = data.level;
    if (data.status) newQuestion.status = data.status;
    if (!_.isEmpty(data.remark)) newQuestion.remark = data.remark;
    if (!_.isEmpty(picture)) newQuestion.picture = picture;
    if (!_.isNil(data?.enable)) newQuestion.enable = data.enable;
    // ...(data.category && { category: data.category }),
    // ...(correctAnswers.length > 0 && { correctAnswerIds: correctAnswers }),
    // ...(listAnswers.length > 0 && { answerIds: listAnswers }),

    await this.chapterService.updateQuiz(chapterId, newQuestion);

    await this.examService.updateQuiz(id, newQuestions);

    if (!_.isEmpty(data.chapterId) && chapterId !== data.chapterId) {
      await this.chapterService.updateQuizzes(chapterId, oldQuestions);
      await this.chapterService.updateQuizzes(data.chapterId, [
        ...newQuestions,
        newQuestion,
      ]);
    }

    const newQuiz = await this.chapterService.getQuiz(
      question.id,
      data.updateBy,
    );

    return newQuiz.question;
  }

  async enableQuestions(data: EnableQuestionsDto): Promise<QuestionEntity[]> {
    const listQuestions: { chapterId: string; question: QuestionEntity }[] = [];
    await Promise.all(
      data.questionsEnable.map(async ({ questionId, enable }: any) => {
        const { chapterId, question } = await this.chapterService.getQuiz(
          questionId,
          data.updateBy,
        );
        if (question) {
          if (question.create_by !== data.updateBy) {
            throw new BusinessException(ErrorEnum.NO_PERMISSON, question.id);
          }
          question.enable = enable;
          listQuestions.push({ chapterId, question });
        }
      }),
    );

    await Promise.all(
      listQuestions.map(async ({ chapterId, question }) => {
        await this.chapterService.updateQuiz(chapterId, question);
      }),
    );

    return listQuestions.map(({ question }) => question);
  }

  async updateStatus(data: UpdateQuestionStatusDto): Promise<QuestionEntity[]> {
    const listQuestions: { chapterId: string; question: QuestionEntity }[] = [];

    await Promise.all(
      data.questionsStatus.map(async ({ questionId, status }) => {
        const { chapterId, question } = await this.chapterService.getQuiz(
          questionId,
          data.updateBy,
        );
        if (question) {
          if (question.create_by !== data.updateBy) {
            throw new BusinessException(ErrorEnum.NO_PERMISSON, question.id);
          }
          question.status = status;
          listQuestions.push({ chapterId, question });
        }
      }),
    );

    await Promise.all(
      listQuestions.map(async ({ chapterId, question }) => {
        await this.chapterService.updateQuiz(chapterId, question);
      }),
    );

    return listQuestions.map(({ question }) => question);
  }

  async deleteMany(ids: string[], uid: string): Promise<string> {
    const listQuestions: { chapterId: string; question: QuestionEntity }[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const index = listQuestions.findIndex(
          ({ question }) => question.id === id,
        );

        if (index === -1) {
          const { chapterId, question } = await this.chapterService.getQuiz(
            id,
            uid,
          );
          listQuestions.push({ chapterId, question });
        }
      }),
    );

    await Promise.all(
      listQuestions.map(async ({ question }) => {
        const isExisted = await this.examService.findByQuestionId(question.id);
        if (isExisted.length !== 0)
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, question.id);
      }),
    );

    for (const { chapterId, question } of listQuestions) {
      const chapter = await this.chapterService.findOne(chapterId);
      const newQuestions = chapter.questions.filter(
        ({ id }) => id !== question.id,
      );

      await this.chapterService.updateQuizzes(chapterId, newQuestions);
    }

    await this.questionRepo.deleteMany({
      id: { $in: listQuestions.map(({ question }) => question.id) },
    });
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
    const chapter = await this.chapterService.findAvailable(chapterId, uid);
    const questions = await this.chapterService.randQuizzes(
      chapterId,
      level,
      quantity,
      uid,
    );

    return { chapter, questions };
  }
}
