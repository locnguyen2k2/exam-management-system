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
import { AnswerService } from '~/modules/system/answer/answer.service';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { searchIndexes } from '~/utils/search';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { IDetailChapter } from '~/modules/system/chapter/chapter.interface';
import { QuestionInfoDto } from '~/modules/system/exam/dtos/exam-req.dto.';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { ImageService } from '~/modules/system/image/image.service';
import * as _ from 'lodash';
import { ExamService } from '~/modules/system/exam/exam.service';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { factorial } from '~/utils/factorial';
import { AnswerBaseDto } from '~/modules/system/answer/dtos/answer-req.dto';
import { v4 as uuid } from 'uuid';
import { paginate } from '~/helpers/paginate/paginate';

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
    private readonly answerService: AnswerService,
    private readonly chapterService: ChapterService,
    private readonly imageService: ImageService,
  ) {}

  async findAll(
    uid: string,
    pageOptions: QuestionPageOptions = new QuestionPageOptions(),
  ) {
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

    return paginate(
      this.questionRepo,
      { pageOptions, filterOptions },
      searchIndexes(pageOptions.keyword),
    );
  }

  async detailQuestion(id: string, uid: string): Promise<QuestionEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted[0].create_by === uid) {
      return isExisted[0];
    }
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async findByChapter(chapterId: string): Promise<QuestionEntity[]> {
    return await this.questionRepo.find({
      where: { 'chapter.id': chapterId },
    });
  }

  async findOne(id: string): Promise<QuestionEntity> {
    const isExisted = await this.questionRepo.findOneBy({ id });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
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

    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
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

        const countCorrectAnswers = questionData.answers.filter(
          (answer: AnswerEntity) => answer.isCorrect,
        );

        if (
          questionData.category !== CategoryEnum.MULTIPLE_CHOICE &&
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

  handleFillInContent(content: string): string[] {
    const listValue = content.split('[__]');
    let isDeleted = 0;
    for (let i = listValue.length - 1; i >= 0; i--) {
      if (_.isEmpty(listValue[i])) {
        if (isDeleted === 0) {
          if (i !== 0) {
            isDeleted += 1;
            listValue.splice(i, 1);
          }
        } else {
          throw new BusinessException(
            '400:Giữa 2 ô trống [__][__] phải có nội dung hoặc dấu ngắt câu!',
          );
        }
      } else {
        if (isDeleted === 1) {
          isDeleted -= 1;
        }
      }
    }

    return listValue;
  }

  handleFillInAnswers(quantity: number, correctAnswer: AnswerBaseDto) {
    if (correctAnswer) {
      if (quantity > this.maxFillInAnswers(correctAnswer))
        throw new BusinessException(
          `400:${this.maxFillInAnswers(correctAnswer)} là số đáp án tối đa`,
        );

      const listAnswers: any[] = [];
      const listCorrectValue = this.handleFillInAnswerValue(
        correctAnswer.value,
      );

      while (listAnswers.length < quantity) {
        const shuffledValues = this.shuffle(listCorrectValue);
        const wrongValue = shuffledValues.reduce(
          (acc: string, curr: string) => acc + `${curr}[__]`,
          '',
        );

        const isDuplicate = listAnswers.some(
          (answer) => answer.value === wrongValue,
        );

        // Ensure no duplicates and that wrongValue does not match correctAnswer.value
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
  }

  async create(data: CreateQuestionsDto): Promise<QuestionEntity[]> {
    const questionsInfo: QuestionEntity[] = [];

    // Kiểm tra chương, nội dung câu hỏi
    await this.beforeAddQuestion(data);

    await Promise.all(
      data.questions.map(async (questionData, index) => {
        let answers = this.classifyAnswers(questionData.answers);

        if (answers.correctAnswers.length === 0)
          throw new BusinessException('400:Phải có ít nhất 1 đáp án đúng!');

        if (questionData.category === CategoryEnum.FILL_IN) {
          const isContent = this.handleFillInContent(questionData.content);

          if (questionData.content.split('[__]').length === 1) {
            throw new BusinessException(
              '400:Nội dung phải có ít nhất 1 chổ trống ký hiệu: [__] để điền giá trị đúng',
            );
          }

          if (!_.isNil(questionData.quantity)) {
            if (
              answers.correctAnswers[0].value.startsWith('[__]') ||
              !answers.correctAnswers[0].value.endsWith('[__]')
            ) {
              throw new BusinessException(
                '400:Đáp án đúng câu hỏi điền khuyết không bắt đầu bằng [__] hoặc kết thúc khác [__]',
              );
            }

            if (
              isContent.length !==
              this.handleFillInAnswerValue(answers.correctAnswers[0].value)
                .length
            ) {
              throw new BusinessException(
                `400:Đáp án không được quá ${isContent.length} giá trị ([__])!`,
              );
            }

            answers = this.handleFillInAnswers(
              questionData.quantity,
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
        const chapter = await this.chapterService.findAvailableChapterById(
          chapterId,
          data.createBy,
        );
        delete questionData.chapterId;

        if (questionData.picture) {
          picture += await this.imageService.uploadImage(questionData.picture);
        }

        const question = new QuestionEntity({
          ...questionData,
          chapter,
          answers: [...new Set(answerEntitties)],
          ...(!_.isEmpty(questionData.picture) && { picture: picture }),
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

  async update(id: string, data: UpdateQuestionDto): Promise<QuestionEntity> {
    const isExisted = await this.findAvailable(id, data.updateBy);
    let chapter = null;

    // const listAnswers: string[] = [];
    // const correctAnswers: CorrectAnswerIdsDto[] = [];
    let picture = '';

    if (data.content) {
      const isReplaced = await this.findByContent(data.content);
      if (isReplaced.id !== id && isReplaced.create_by === data.updateBy)
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.content);
    }

    if (data.chapterId) {
      chapter = await this.chapterService.findAvailableById(
        data.chapterId,
        data.updateBy,
      );
    }

    const category = data.category ? data.category : isExisted.category;

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
        // ...(correctAnswers.length > 0 && { correctAnswerIds: correctAnswers }),
        // ...(listAnswers.length > 0 && { answerIds: listAnswers }),
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
            throw new BusinessException(ErrorEnum.NO_PERMISSON, isExisted.id);
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
          throw new BusinessException(ErrorEnum.NO_PERMISSON, questionId);
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

  async deleteMany(ids: string[], uid: string): Promise<string> {
    const listQuestion: string[] = [];
    const listIds: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const index = listIds.findIndex((questId) => questId === id);
        if (index === -1) {
          await this.findAvailable(id, uid);
          listIds.push(id);
        }
      }),
    );

    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.examService.findByQuestionId(id);
        if (isExisted.length !== 0)
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);
        listQuestion.push(id);
      }),
    );

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

  shuffle(arr: any[]): any[] {
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
    const handleQuestions: QuestionEntity[] = this.shuffle(questions);

    await Promise.all(
      questions.map(async ({ id, answers }) => {
        const oldAnswers = answers;
        const handleAnswers = this.shuffle(oldAnswers.map(({ id }) => id));
        const index = handleQuestions.findIndex((quest) => quest.id === id);
        handleQuestions[index]['answers'] = handleAnswers.map((id) =>
          oldAnswers.find((answer) => answer.id === id),
        );
      }),
    );

    return handleQuestions.slice(0, quantity);
  }
}
