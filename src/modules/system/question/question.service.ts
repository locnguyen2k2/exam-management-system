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
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
// import {
//   regSpecialChars,
//   regWhiteSpace,
// } from '~/common/constants/regex.constant';
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
import { shuffle } from '~/utils/shuffle';
import { FileUpload } from '~/modules/system/image/image.interface';

export interface IClassifyQuestion {
  chapterId: string;
  info: {
    level: LevelEnum;
    category: CategoryEnum;
    questions: QuestionEntity[];
  }[];
}

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: MongoRepository<QuestionEntity>,
    @Inject(forwardRef(() => ExamService))
    private readonly examService: ExamService,
    // private readonly answerService: AnswerService,
    private readonly chapService: ChapterService,
    private readonly imageService: ImageService,
  ) {}

  async findAll(
    uid: string,
    chapterId: string,
    pageOptions: QuestionPageOptions = new QuestionPageOptions(),
  ) {
    const paginated = await this.chapService.findQuizzes(
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
    const { question } = await this.chapService.findAvailableQuiz(id, uid);
    if (question) return question;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  // Kiểm tra đầu vào
  async checkCreateQuestion(data: any) {
    await this.chapService.findAvailable(data.chapterId, data.createBy);

    const listQuestion = [];
    const isReplaced = await this.chapService.findByQuizContent(data.content);

    if (isReplaced && isReplaced.id === data.chapterId)
      throw new BusinessException(ErrorEnum.RECORD_EXISTED, `${data.content}`);

    const totalCorrectAnswer = data.answers.filter(
      (answer: AnswerEntity) => answer.isCorrect,
    );

    if (
      data.category !== CategoryEnum.MULTIPLE_CHOICE &&
      totalCorrectAnswer.length > 1
    )
      throw new BusinessException(
        '400:Ngoài trắc nghiệm nhiều lựa chọn, tất cả câu hỏi khác chỉ có 1 đáp án đúng!',
      );

    if (
      listQuestion.find(
        (quest: any) =>
          quest.content.toLowerCase().replace(/\s/g, '') ===
          data.content.toLowerCase().replace(/\s/g, ''),
      )
    )
      throw new BusinessException(
        `400:Nội dung câu hỏi ${data.content} bị trùng!`,
      );

    listQuestion.push(data);
  }

  // Phân loại câu hỏi (Đúng/Sai)
  classifyAnswers(answers: any): {
    wrongAnswers: AnswerBaseDto[];
    correctAnswers: AnswerBaseDto[];
  } {
    const wrongAnswers: AnswerBaseDto[] = []; // Số đáp án đúng
    const correctAnswers: AnswerBaseDto[] = []; // Số đáp án sai

    for (const answer of answers) {
      if (answer.isCorrect) {
        if (_.isNil(answer.score) || answer.score === 0) {
          throw new BusinessException(
            `400:Đáp án "${answer.value}" phải có điểm`,
          );
        }

        const isReplaced = correctAnswers.find(
          (correctAnswer) => correctAnswer.value === answer.value,
        );

        if (!isReplaced) {
          correctAnswers.push(new AnswerEntity({ ...answer }));
        }
      } else {
        const isReplaced = wrongAnswers.find(
          (wrongAnswer) => wrongAnswer.value === answer.value,
        );

        if (!_.isNil(answer.score) && answer.score > 0)
          throw new BusinessException(
            `400:Đáp án "${answer.value}" điểm phải bằng 0`,
          );

        if (!isReplaced) {
          wrongAnswers.push(new AnswerEntity({ ...answer }));
        }
      }
    }

    return { wrongAnswers, correctAnswers };
  }

  maxFillInAnswerValue(correctAnswer: AnswerBaseDto): number {
    const listCorrectValue = this.listFillInAnswerValue(correctAnswer.value);
    return factorial(listCorrectValue.length);
  }

  listFillInAnswerValue(value: string): string[] {
    const listValue = value.split('[__]');
    let isDeleted = 0;
    for (let i = listValue.length - 1; i >= 0; i--) {
      if (_.isEmpty(listValue[i])) {
        if (isDeleted === 0) {
          isDeleted += 1;
          listValue.splice(i, 1);
        } else {
          throw new BusinessException(
            '400:Trước ký hiệu [__] của đáp án phải có giá trị!',
          );
        }
      }
    }

    return listValue;
  }

  isValidFillInQuiz(content: string, answerValue: string) {
    const listValue = content.split('[__]');
    const quantityValue = listValue.length - 1;

    if (listValue.length <= 1)
      throw new BusinessException(
        '400:Nội dung phải có ít nhất 1 ô trống ([__])',
      );

    if (quantityValue !== this.listFillInAnswerValue(answerValue).length)
      throw new BusinessException(
        `400:Đáp án phải có ${quantityValue} giá trị ([__])!`,
      );
  }

  randFillInAnswer(
    answers: AnswerBaseDto[],
    quantityWrongAnswer: number,
  ): { correctAnswers: AnswerBaseDto[]; wrongAnswers: AnswerBaseDto[] } {
    const listAnswers: any[] = [];
    const classifyAnswer = this.classifyAnswers(answers);
    const correctAnswer = classifyAnswer.correctAnswers[0];
    const maxWrongAnswer = this.maxFillInAnswerValue(correctAnswer) - 1;
    const isStart = correctAnswer.value.startsWith('[__]');
    const isEnd = !correctAnswer.value.endsWith('[__]');
    const listCorrectValue = this.listFillInAnswerValue(correctAnswer.value);

    if (isStart || isEnd)
      throw new BusinessException(
        '400:Đáp án điền khuyết không bắt đầu bằng [__] hoặc kết thúc khác [__]',
      );

    if (quantityWrongAnswer > maxWrongAnswer)
      throw new BusinessException(
        `400:${maxWrongAnswer} là số đáp án nhiễu tối đa`,
      );

    while (listAnswers.length < quantityWrongAnswer) {
      const shuffledValues = shuffle(listCorrectValue);
      const wrongValue = shuffledValues.reduce(
        (acc: string, curr: string) => acc + `${curr}[__]`,
        '',
      );

      const isDuplicate = listAnswers.some(
        (answer) => answer.value === wrongValue,
      );

      if (!isDuplicate && wrongValue !== correctAnswer.value) {
        listAnswers.push(
          new AnswerEntity({
            score: null,
            isCorrect: false,
            value: wrongValue,
            enable: correctAnswer.enable,
          }),
        );
      }
    }

    return {
      correctAnswers: [correctAnswer],
      wrongAnswers: listAnswers,
    };
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: { chapterId: string; question: QuestionEntity }[] = [];

    // Kiểm tra câu hỏi
    await Promise.all(
      data.questions.map(
        async (questionData: any) =>
          await this.checkCreateQuestion({
            ...questionData,
            createBy: data.createBy,
          }),
      ),
    );

    await Promise.all(
      data.questions.map(async (questionData, index) => {
        // Phân loại câu hỏi
        let answers = this.classifyAnswers(questionData.answers);

        if (answers.correctAnswers.length === 0)
          throw new BusinessException('400:Phải có ít nhất 1 đáp án đúng!');

        if (questionData.category === CategoryEnum.FILL_IN) {
          this.isValidFillInQuiz(
            questionData.content,
            answers.correctAnswers[0].value,
          );

          const maxAnswerValue = this.maxFillInAnswerValue(
            answers.correctAnswers[0],
          );

          if (answers.wrongAnswers.length > maxAnswerValue)
            throw new BusinessException(
              `400:${maxAnswerValue} là số đáp án tối đa`,
            );

          if (!_.isNil(questionData.quantityWrongAnswers)) {
            answers = this.randFillInAnswer(
              questionData.answers,
              questionData.quantityWrongAnswers,
            );
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
        const listAnswer = answers.map(
          (answer) =>
            new AnswerEntity({
              ...answer,
              create_by: data.createBy,
              update_by: data.createBy,
            }),
        );
        let picture = '';

        if (questionData.picture) {
          const image: Promise<FileUpload> = new Promise((resolve) =>
            resolve(questionData.picture),
          );

          picture += await this.imageService.uploadImage(image);
        }

        delete questionData.picture;

        const initial = new QuestionEntity({
          ...questionData,
          answers: [...new Set(listAnswer)],
          ...(!_.isEmpty(picture) && { picture: picture }),
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
          await this.chapService.addQuizzes(chapterId, [question]),
      ),
    );

    return questionsInfo.map(({ question }) => question);
  }

  async findAnswer(quizId: string, answerId: string): Promise<AnswerEntity> {
    const isQuiz = await this.chapService.findAvailableQuiz(quizId);
    const answer = isQuiz.question.answers.find(({ id }) => id === answerId);
    if (!answer)
      throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, answerId);
    return answer;
  }

  async update(id: string, data: UpdateQuestionDto): Promise<QuestionEntity> {
    let picture = '';
    let newQuestions = [];
    let oldQuestions = [];
    const { chapterId, question } = await this.chapService.findAvailableQuiz(
      id,
      data.updateBy,
    );
    const newQuestion = question;
    // Lấy danh sách câu hỏi không cập nhật
    let answers: any[] = !_.isEmpty(data.answers)
      ? question.answers.filter(
          (answer) =>
            !data.answers.some((dataAnswer) => dataAnswer.id === answer.id),
        )
      : question.answers;

    const content = !_.isEmpty(data.content) ? data.content : question.content;
    const category = !_.isEmpty(data.category)
      ? data.category
      : question.category;
    // Lấy danh sách câu hỏi cập nhật
    if (!_.isEmpty(data.answers)) {
      await Promise.all(
        data.answers.map(async (answer) =>
          answers.push({
            ...(await this.findAnswer(id, answer.id)),
            ...answer,
          }),
        ),
      );
    }

    if (!_.isEmpty(data.chapterId) && chapterId !== data.chapterId) {
      const newChapter = await this.chapService.findAvailable(
        data.chapterId,
        data.updateBy,
      );
      const oldChapter = await this.chapService.findAvailable(
        chapterId,
        data.updateBy,
      );

      oldQuestions = oldChapter.questions.filter((question) => {
        if (question.id !== id) return question;
      });
      newQuestions = newChapter.questions.filter((question) => question);
    }

    if (data.content) {
      const isReplaced = await this.chapService.findByQuizContent(content);

      if (
        isReplaced &&
        isReplaced.id !== chapterId &&
        isReplaced.create_by === question.create_by
      ) {
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, `${content}`);
      }
    }

    if (!_.isEmpty(category)) {
      if (category !== CategoryEnum.MULTIPLE_CHOICE) {
        const { correctAnswers } = this.classifyAnswers(answers);

        if (correctAnswers.length > 1)
          throw new BusinessException(
            '400:Ngoài trắc nghiệm nhiều đáp án, các câu hỏi khác chỉ có 1 đáp án',
          );
      }

      if (category === CategoryEnum.FILL_IN) {
        const { correctAnswers, wrongAnswers } = this.classifyAnswers(answers);
        const maxAnswerValue = this.maxFillInAnswerValue(correctAnswers[0]);

        this.isValidFillInQuiz(content, correctAnswers[0].value);

        if (wrongAnswers.length > maxAnswerValue)
          throw new BusinessException(
            `400:${this.maxFillInAnswerValue(correctAnswers[0])} là số đáp án nhiễu tối đa`,
          );

        if (!_.isNil(data.quantityWrongAnswers)) {
          const fillInAnswers = this.randFillInAnswer(
            answers,
            data.quantityWrongAnswers,
          );

          answers = [
            ...fillInAnswers.correctAnswers,
            ...fillInAnswers.wrongAnswers,
          ];
        }
      }
    }

    if (!_.isNil(data.picture)) {
      !_.isEmpty(question.picture) &&
        (await this.imageService.deleteImage(question.picture));
      const image: Promise<FileUpload> = new Promise((resolve) =>
        resolve(data.picture),
      );
      picture += await this.imageService.uploadImage(image);
    }

    newQuestion.update_by = data.updateBy;
    if (!_.isEmpty(data.content)) newQuestion.content = data.content;
    if (data.level) newQuestion.level = data.level;
    if (data.status) newQuestion.status = data.status;
    if (!_.isEmpty(data.remark)) newQuestion.remark = data.remark;
    if (!_.isEmpty(picture)) newQuestion.picture = picture;
    if (!_.isNil(data?.enable)) newQuestion.enable = data.enable;
    if (!_.isNil(data?.category)) newQuestion.category = data.category;
    if (!_.isEmpty(data?.answers))
      newQuestion.answers = answers.map((answer) => new AnswerEntity(answer));

    await this.chapService.updateQuiz(chapterId, newQuestion);
    await this.examService.updateQuiz(id, newQuestion);

    if (!_.isEmpty(data.chapterId) && chapterId !== data.chapterId) {
      await this.chapService.updateQuizzes(chapterId, oldQuestions);
      await this.chapService.updateQuizzes(data.chapterId, [
        ...newQuestions,
        newQuestion,
      ]);
    }

    const newQuiz = await this.chapService.findAvailableQuiz(
      question.id,
      data.updateBy,
    );

    return newQuiz.question;
  }

  async enableQuestions(data: EnableQuestionsDto): Promise<QuestionEntity[]> {
    const listQuestions: { chapterId: string; question: QuestionEntity }[] = [];
    await Promise.all(
      data.questionsEnable.map(async ({ questionId, enable }: any) => {
        const { chapterId, question } =
          await this.chapService.findAvailableQuiz(questionId, data.updateBy);
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
        await this.chapService.updateQuiz(chapterId, question);
      }),
    );

    return listQuestions.map(({ question }) => question);
  }

  async updateStatus(data: UpdateQuestionStatusDto): Promise<QuestionEntity[]> {
    const listQuestions: { chapterId: string; question: QuestionEntity }[] = [];

    await Promise.all(
      data.questionsStatus.map(async ({ questionId, status }) => {
        const { chapterId, question } =
          await this.chapService.findAvailableQuiz(questionId, data.updateBy);
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
        await this.chapService.updateQuiz(chapterId, question);
      }),
    );

    return listQuestions.map(({ question }) => question);
  }

  async deleteMany(ids: string[], uid: string): Promise<string> {
    const listQuestions: { chapterId: string; question: QuestionEntity }[] = [];

    await Promise.all(
      ids.map(async (id) => {
        if (await this.examService.examHasQuiz(id))
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);

        const index = listQuestions.findIndex(
          ({ question }) => question.id === id,
        );

        if (index === -1) {
          const { chapterId, question } =
            await this.chapService.findAvailableQuiz(id, uid);

          listQuestions.push({ chapterId, question });
        }
      }),
    );

    for (const { chapterId, question } of listQuestions) {
      const chapter = await this.chapService.findOne(chapterId);
      const newQuestions = chapter.questions.filter(
        ({ id }) => id !== question.id,
      );

      !_.isEmpty(question.picture) &&
        (await this.imageService.deleteImage(question.picture));

      await this.chapService.updateQuizzes(chapterId, newQuestions);
    }

    return '200:Xóa câu hỏi thành công!';
  }

  async randQuestsByScales(
    scales: IScale[],
    totalQuestions: number,
    uid: string,
  ) {
    return await Promise.all(
      scales.map(async (scale) => {
        const { chapterId, percent, level, category } = scale;
        const questionQty = Math.ceil((percent * totalQuestions) / 100);
        // Lấy ngẫu nhiên câu hỏi trong chương theo số lượng
        const { questions, chapter } = await this.randQuestsByChap(
          chapterId,
          level,
          category,
          questionQty,
          uid,
        );

        if (questions.length - questionQty < 0)
          throw new BusinessException(
            `400:Chương ${chapter.id}, tỷ lệ( ${questions.length}/${questionQty}) ` +
              `câu ${LevelEnum[`${level.toUpperCase()}`]} ` +
              `thuộc ${CategoryEnum[`${category.toUpperCase()}`]}`,
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
    category: CategoryEnum,
    quantity: number,
    uid: string,
  ): Promise<IDetailChapter> {
    const chapter = await this.chapService.findAvailable(chapterId, uid);
    const questions = await this.chapService.randQuizzes(
      chapterId,
      level,
      category,
      quantity,
      uid,
    );

    return { chapter, questions };
  }
}
