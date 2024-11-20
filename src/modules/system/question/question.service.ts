import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateQuestionsDto,
  EnableQuestionsDto,
  ImportQuestionDto,
  QuestionPageOptions,
  UpdateQuestionDto,
  UpdateQuestionStatusDto,
} from '~/modules/system/question/dtos/question-req.dto';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
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
import * as Excel from 'xlsx';
import { WorkBook, WorkSheet } from 'xlsx';
import { plainToClass } from 'class-transformer';

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
  async checkCreateQuestion(data: any, index?: number) {
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
        `400:row${index}|Ngoài trắc nghiệm nhiều lựa chọn, tất cả câu hỏi khác chỉ có 1 đáp án đúng!`,
      );

    if (
      listQuestion.find(
        (quest: any) =>
          quest.content.toLowerCase().replace(/\s/g, '') ===
          data.content.toLowerCase().replace(/\s/g, ''),
      )
    )
      throw new BusinessException(`400:row${index}|Nội dung câu hỏi bị trùng!`);

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
          (correctAnswer) =>
            correctAnswer.value.replaceAll(' ', '').toLowerCase() ===
            answer.value.replaceAll(' ', '').toLowerCase(),
        );

        if (!isReplaced) {
          correctAnswers.push(new AnswerEntity({ ...answer }));
        }
      } else {
        const isReplaced = wrongAnswers.find(
          (wrongAnswer) =>
            wrongAnswer.value.replaceAll(' ', '').toLowerCase() ===
            answer.value.replaceAll(' ', '').toLowerCase(),
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
        `400:${content} phải có ít nhất 1 ô trống ([__])`,
      );

    if (quantityValue !== this.listFillInAnswerValue(answerValue).length)
      throw new BusinessException(
        `400:Đáp án ${answerValue} phải có ${quantityValue} giá trị ([__])!`,
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
        `400:Đáp án ${correctAnswer.value} không bắt đầu bằng [__] hoặc kết thúc khác [__]`,
      );

    if (quantityWrongAnswer > maxWrongAnswer)
      throw new BusinessException(
        `400:${correctAnswer.value}, ${maxWrongAnswer} là số đáp án nhiễu tối đa`,
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
      correctAnswers: classifyAnswer.correctAnswers,
      wrongAnswers: listAnswers,
    };
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: { chapterId: string; question: QuestionEntity }[] = [];
    const quizzesContent: string[] = [];
    // Kiểm tra câu hỏi
    await Promise.all(
      data.questions.map(async (questionData: any, index: number) => {
        const content = questionData.content.replaceAll(' ', '').toLowerCase();

        if (quizzesContent.find((val) => val === content))
          throw new BusinessException(
            `400:row${index + 1}|Nội dung câu hỏi bị trùng!`,
          );

        quizzesContent.push(content);
        await this.checkCreateQuestion(
          {
            ...questionData,
            createBy: data.createBy,
          },
          index + 1,
        );
      }),
    );

    await Promise.all(
      data.questions.map(async (questionData, index) => {
        // Phân loại câu hỏi
        let answers = this.classifyAnswers(questionData.answers);

        if (answers.correctAnswers.length === 0)
          throw new BusinessException(
            `400:row${index + 1}|Phải có ít nhất 1 đáp án đúng!`,
          );

        if (questionData.category === CategoryEnum.FILL_IN) {
          let maxAnswerValue = 0;
          try {
            this.isValidFillInQuiz(
              questionData.content,
              answers.correctAnswers[0].value,
            );
            maxAnswerValue = this.maxFillInAnswerValue(
              answers.correctAnswers[0],
            );
          } catch (err: any) {
            throw new BusinessException(`400:row${index + 1}|${err.message}`);
          }

          if (answers.wrongAnswers.length > maxAnswerValue)
            throw new BusinessException(
              `400:row${index + 1}|${maxAnswerValue} là số đáp án tối đa`,
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
    let newQuestions = []; // Danh sách câu hỏi mới
    let oldQuestions = []; // Danh sách câu hỏi cũ
    let answers = []; // Danh sách đáp án
    const { updateBy } = data;
    const chapter = await this.chapService.findAvailableQuiz(id, updateBy);
    const { chapterId, question } = chapter;
    let content = question.content;
    const newQuestion = question;
    const category = data.category ? data.category : question.category;
    newQuestion.update_by = updateBy;

    if (!_.isEmpty(data.answers)) {
      // Lấy danh sách câu hỏi không cập nhật
      for (const answer of question.answers) {
        if (!data.answers.some((newAnswer) => newAnswer.id === answer.id))
          answers.push(answer);
      }
      // Lấy danh sách thông tin đáp án cập nhật và đáp án mới
      await Promise.all(
        data.answers.map(async (answer) => {
          const isUpdate =
            !_.isNil(answer.id) && (await this.findAnswer(id, answer.id));
          const newAnswer = isUpdate
            ? {
                ...isUpdate,
                ...answer,
                created_at: isUpdate.created_at,
                update_by: updateBy,
              }
            : new AnswerEntity({
                ...answer,
                update_by: updateBy,
                create_by: updateBy,
              });

          if (
            (!_.isNil(answer.id) && !_.isEmpty(answer.value)) ||
            _.isNil(answer.id)
          ) {
            const handleValue = answer.value.replaceAll(' ', '').toLowerCase();
            const isReplaced = answers.find(
              ({ value }) =>
                value.replaceAll(' ', '').toLowerCase() === handleValue,
            );

            if (
              isReplaced &&
              (_.isNil(answer.id) || answer.id !== isReplaced.id)
            )
              throw new BusinessException(
                `400:Đáp án bị trùng ${answer.value}`,
              );
          }

          answers.push(newAnswer);
        }),
      );
    }

    const { correctAnswers } = this.classifyAnswers(answers);

    if (!_.isNil(data.chapterId) && chapterId !== data.chapterId) {
      const newChapter = await this.chapService.findAvailable(
        data.chapterId,
        updateBy,
      );
      const oldChapter = await this.chapService.findAvailable(
        chapterId,
        updateBy,
      );

      oldQuestions = oldChapter.questions.filter(
        (question) => question.id !== id,
      );
      newQuestions = newChapter.questions.filter((question) => question);
    }

    if (!_.isEmpty(data.content)) {
      content = data.content;
      const isReplaced = await this.chapService.findByQuizContent(data.content);

      if (
        isReplaced &&
        isReplaced.id !== chapterId &&
        isReplaced.create_by === updateBy
      )
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, `${content}`);
    }

    if (category !== CategoryEnum.MULTIPLE_CHOICE && correctAnswers.length > 1)
      throw new BusinessException(
        '400:Ngoài câu hỏi nhiều đáp án, câu hỏi khác chỉ có 1 đáp án đúng',
      );

    if (category === CategoryEnum.FILL_IN) {
      // Kiểm tra tính hợp lệ cuủa nội dung và đáp án
      this.isValidFillInQuiz(content, correctAnswers[0].value);

      if (!_.isNil(data.quantityWrongAnswers)) {
        const { wrongAnswers } = this.randFillInAnswer(
          answers,
          data.quantityWrongAnswers,
        );

        answers = [...correctAnswers, ...wrongAnswers];
      }
    }

    if (!_.isNil(data.picture)) {
      const image: Promise<FileUpload> = new Promise((resolve) =>
        resolve(data.picture),
      );
      if (!_.isEmpty(question.picture))
        await this.imageService.deleteImage(question.picture);
      picture += await this.imageService.uploadImage(image);
    }

    newQuestion.content = content;
    newQuestion.category = category;
    newQuestion.answers = answers;
    newQuestion.updated_at = data.updated_at;

    if (data.level) newQuestion.level = data.level;
    if (data.status) newQuestion.status = data.status;
    if (!_.isEmpty(picture)) newQuestion.picture = picture;
    if (!_.isNil(data.enable)) newQuestion.enable = data.enable;
    if (!_.isEmpty(data.remark)) newQuestion.remark = data.remark;

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

      if (!_.isEmpty(question.picture))
        await this.imageService.deleteImage(question.picture);

      await this.chapService.updateQuizzes(chapterId, newQuestions);
    }

    return '200:Xóa câu hỏi thành công!';
  }

  async importFile(args: ImportQuestionDto): Promise<QuestionEntity[]> {
    const file: any = new Promise((resolve) => resolve(args.file));
    const { createReadStream } = await file;
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      createReadStream()
        .on('data', (chunk: any) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
    let workbook: WorkBook;
    try {
      workbook = Excel.read(buffer, { type: 'buffer' });
    } catch (err: any) {
      throw new BusinessException(`400:File không hợp lệ!`);
    }
    const sheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = Excel.utils.decode_range(sheet['!ref']);
    // Check name of columns
    for (let C = range.s.c; C <= range.e.c; C++) {
      const colName = sheet[Excel.utils.encode_cell({ c: C, r: 0 })]?.v;
      switch (C) {
        case 0:
          if (colName !== 'chapterId')
            throw new BusinessException(`400:Cột ${C + 1} phải là 'chapterId'`);
          break;
        case 1:
          if (colName !== 'content')
            throw new BusinessException(`400:Cột ${C + 1} phải là 'content'`);
          break;
        case 2:
          if (colName !== 'level')
            throw new BusinessException(`400:Cột ${C + 1} phải là 'level'`);
          break;
        case 3:
          if (colName !== 'category')
            throw new BusinessException(`400:Cột ${C + 1} phải là 'category'`);
          break;
        case 4:
          if (colName !== 'status')
            throw new BusinessException(
              `400:Cột ${C + 1} phải là cột 'status'`,
            );
          break;
        case 5:
          if (colName !== 'enable')
            throw new BusinessException(`400:Cột ${C + 1} phải là 'enable'`);
          break;
        case 6:
          if (colName !== 'description')
            throw new BusinessException(
              `400:Cột ${C + 1} phải là 'description'`,
            );
          break;
        case 7:
          if (colName !== 'quantityWrongAnswers')
            throw new BusinessException(
              `400:Cột ${C + 1} phải là 'quantityWrongAnswers'`,
            );
          break;
        default:
          if (colName !== 'answer')
            throw new BusinessException(`400:Cột ${C + 1} phải là 'answer'`);
          break;
      }
    }

    const data = [];
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const handleData: any = {};
      handleData['answers'] = [];
      if (R === 0 || !sheet[Excel.utils.encode_cell({ c: 0, r: R })]) {
        continue;
      }
      for (let C = range.s.c; C <= range.e.c; C++) {
        const colName = sheet[Excel.utils.encode_cell({ c: C, r: 0 })]?.v;
        const idxRow = R + 1;
        const value = sheet[Excel.utils.encode_cell({ c: C, r: R })]?.v;
        switch (C) {
          case 0:
            handleData[`${colName}`] = value.toString();
            break;
          case 1:
            handleData[colName] = value.toString();
            break;
          case 2:
            if (!LevelEnum[value])
              throw new BusinessException(
                `400:Level [c${C + 1}r${idxRow}] không hợp lệ`,
              );
            handleData[colName] = value.toString().toLowerCase();
            break;
          case 3:
            if (!CategoryEnum[value])
              throw new BusinessException(
                `400:Category [c${C + 1}r${idxRow}] không hợp lệ`,
              );
            handleData[colName] = value.toString().toLowerCase();
            break;
          case 4:
            handleData[colName] = value.toString().toLowerCase();
            break;
          case 5:
            handleData[colName] = value.toString() === 'true';
            break;
          case 6:
            handleData[colName] = value ? value.toString() : '';
            break;
          case 7:
            handleData[colName] = parseInt(value) ? parseInt(value) : 0;
            break;
          default: {
            if (value) {
              const answer: any = {};
              const listValue = value.split(',');
              listValue.map((val: any) => {
                const values = val.split(':');
                answer[`${values[0]}`] =
                  values[0] === 'isCorrect' || values[0] === 'enable'
                    ? values[1].replaceAll(' ', '') === 'true'
                    : values[0] === 'score'
                      ? parseFloat(values[1].replaceAll(' ', ''))
                      : !_.isNil(values[1])
                        ? values[1]
                        : '';
              });
              if (
                _.isNil(answer['isCorrect']) ||
                _.isNil(answer['score']) ||
                _.isNil(answer['value'])
              ) {
                throw new BusinessException(
                  `400:Đáp án không hợp lệ [c${C + 1}r${idxRow}]`,
                );
              }
              handleData['answers'].push(answer);
              if (
                (C + 1 >= 9 &&
                  !sheet[Excel.utils.encode_cell({ c: C + 1, r: R })]?.v) ||
                C === range.e.c
              ) {
                data.push(handleData);
              }
            } else if (C === 8) {
              throw new BusinessException(
                `400:Trống trường đáp án [c${C + 1}r${idxRow}]`,
              );
            }
            break;
          }
        }
        // Check đáp án bị dứt quảng
        if (
          C + 1 >= 9 &&
          !sheet[Excel.utils.encode_cell({ c: C + 1, r: R })]?.v
        )
          break;
      }
    }
    let listQuestion: QuestionEntity[] = [];

    try {
      listQuestion = await this.create(
        plainToClass(CreateQuestionsDto, {
          questions: [...data],
          createBy: args.createdBy,
        }),
      );
    } catch (err: any) {
      const code = err.errorCode;
      const message: string[] = err.message.split('|');
      if (message.length > 1)
        throw new BusinessException(
          `${code}:row[${parseInt(message[0].slice(3, message[0].length)) + 1}]|${message[1]}`,
        );
      return err;
    }

    return listQuestion;
  }

  async randQuestsByScales(
    scales: IScale[],
    totalQuestions: number,
    uid: string,
  ) {
    return await Promise.all(
      scales.map(async (scale) => {
        const { chapterId, percent, level, category, score } = scale;
        const questionQty = Math.ceil((percent * totalQuestions) / 100);
        // Lấy ngẫu nhiên câu hỏi trong chương theo số lượng
        const { questions, chapter } = await this.randQuestsByChap(
          chapterId,
          level,
          category,
          questionQty,
          uid,
          score,
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
    score: number,
  ): Promise<IDetailChapter> {
    const chapter = await this.chapService.findAvailable(chapterId, uid);
    const questions = await this.chapService.randQuizzes(
      chapterId,
      level,
      category,
      quantity,
      uid,
      score,
    );

    return { chapter, questions };
  }
}
