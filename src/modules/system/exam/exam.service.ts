import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { MongoRepository } from 'typeorm';
import {
  IClassifyQuestion,
  QuestionService,
} from '~/modules/system/question/question.service';
import {
  CreateExamPaperDto,
  EnableExamsDto,
  ExamPaperPageOptions,
  GenerateExamPaperDto,
  UpdateExamPaperDto,
} from '~/modules/system/exam/dtos/exam-req.dto.';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { randomNumbs } from '~/utils/random';
import * as _ from 'lodash';
import { handleLabel } from '~/utils/label';
import { alphabet } from '~/modules/system/exam/exam.constant';
import { LessonService } from '~/modules/system/lesson/lesson.service';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { shuffle } from '~/utils/shuffle';
import { ExamQuestionDto } from '~/modules/system/question/dtos/question-res.dto';

export interface IChapterQuestion {
  chapterId: string;
  question: QuestionEntity;
}

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepo: MongoRepository<ExamEntity>,
    private readonly lessonService: LessonService,
    private readonly chapterService: ChapterService,
    private readonly questionService: QuestionService,
  ) {}

  async findAll(
    uid: string = null,
    pageOptions: ExamPaperPageOptions = new ExamPaperPageOptions(),
    lessonId: string,
  ) {
    const paginated = await this.lessonService.paginateExams(
      lessonId,
      pageOptions,
      uid,
    );
    return {
      data: paginated.data[0] ? paginated.data[0].exams : [],
      meta: paginated.meta,
    };
  }

  async getExamDetail(id: string, uid?: string): Promise<ExamEntity> {
    const exam: any = await this.findOne(id);

    if (uid && exam.create_by !== uid)
      throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);

    return exam;
  }

  async findOne(id: string): Promise<ExamEntity> {
    const isExisted = await this.lessonService.findByExamId(id);

    if (!isExisted) throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);

    return isExisted.exams.find((exam) => exam.id === id);
  }

  async findByQuestionId(questionId: string): Promise<ExamEntity[]> {
    const isExisted = await this.lessonService.findExamsByQuiz(questionId);
    const isExams = isExisted.map(({ exams }) => exams).flat();

    if (isExams) return isExams;

    throw new BusinessException(
      ErrorEnum.RECORD_NOT_FOUND,
      `Question ${questionId}`,
    );
  }

  async examHasQuiz(questionId: string): Promise<boolean> {
    const isExisted = await this.lessonService.findExamsByQuiz(questionId);
    const isExams = isExisted.map(({ exams }) => exams).flat();

    return !_.isEmpty(isExams);
  }

  handleAnswersLabel(ids: string[], answerLabel: string) {
    return ids.map((answerId, index) => {
      const chars = alphabet.split('');
      const label = handleLabel(answerLabel, `${chars[index]}`);

      return { answerId, label };
    });
  }

  handleQuestionLabel(
    questions: QuestionEntity[],
    questionLabel: string,
    answerLabel: string,
  ) {
    return questions.map((question, index) => {
      const answerIds = this.handleAnswersLabel(
        question.answers.map(({ id }) => id),
        answerLabel,
      );

      const answers = [];

      answerIds.map((answer) => {
        const isAnswer: AnswerEntity = question.answers.find(
          ({ id }) => id === answer.answerId,
        );

        answers.push({
          ...isAnswer,
          label: answer.label,
        });
      });

      return {
        ...question,
        answers: answers,
        label: handleLabel(questionLabel, `${index + 1}`),
      };
    });
  }

  async create(data: CreateExamPaperDto): Promise<ExamEntity[]> {
    const { lessonId, createBy } = data;
    const exams: any = [];
    const lesson = await this.lessonService.detailLesson(lessonId, createBy);

    const chapter: IChapterQuestion[] = await Promise.all(
      data.questionIds.map(async (questionId) => {
        const { chapterId, question } =
          await this.chapterService.findAvailableQuiz(
            questionId,
            data.createBy,
          );

        return { chapterId, question };
      }),
    );

    chapter.map(({ chapterId }) => {
      const isChapter = lesson.chapters.some(
        (chapter) => chapter.id === chapterId,
      );
      if (!isChapter)
        throw new BusinessException(
          ErrorEnum.RECORD_NOT_FOUND,
          `Chapter ${chapterId}`,
        );
    });

    const classifyQuizzes = this.classifyQuestions(chapter);
    const scales = await this.getQuestionRate(classifyQuizzes);
    const listQuestions = chapter.map(({ question }) => question);

    for (let i = 0; i < data.numberExams; i++) {
      const randQuestions = this.randomQuestions(listQuestions);
      const questions: any[] = this.handleQuestionLabel(
        randQuestions,
        data.questionLabel,
        data.answerLabel,
      );

      const newExam = new ExamEntity({
        label: data.label,
        time: data.time,
        sku: data.sku + randomNumbs(3),
        status: data.status,
        enable: data.enable,
        maxScore: data.maxScore,
        scales,
        questions: questions.map((question) => {
          return {
            ...question,
            label: question.label,
          };
        }),
        create_by: createBy,
        update_by: createBy,
      });

      exams.push(newExam);
    }

    const createExams = this.examRepo.create(exams);

    await this.lessonService.addExams(lessonId, createExams);

    return createExams;
  }

  randomQuestions(
    questions: QuestionEntity[],
    quantity: number = questions.length,
  ): QuestionEntity[] {
    const handleQuestions: QuestionEntity[] = shuffle(questions);

    questions.map(({ id, answers }) => {
      const index = handleQuestions.findIndex((quest) => quest.id === id);
      handleQuestions[index]['answers'] = shuffle(answers);
    });

    return handleQuestions.slice(0, quantity);
  }

  // Phân loại danh sách câu hỏi
  classifyQuestions(data: IChapterQuestion[]): IClassifyQuestion[] {
    const result: IClassifyQuestion[] = [];

    data.map(({ chapterId, question }) => {
      const idxChap = result.findIndex((info) => info.chapterId === chapterId);

      if (idxChap > -1) {
        const idxLv = result[idxChap].info.findIndex(
          (info) => info.level === question.level,
        );

        if (idxLv > -1) {
          result[idxChap].info[idxLv].questions.push(question);
        } else {
          result[idxChap].info.push({
            level: question.level,
            questions: [question],
          });
        }
      } else {
        result.push({
          chapterId: chapterId,
          info: [{ level: question.level, questions: [question] }],
        });
      }
    });

    return result;
  }

  async getQuestionRate(data: IClassifyQuestion[]): Promise<IScale[]> {
    const totalQuestions = data
      .map(({ info }) => info.map(({ questions }) => questions).flat())
      .flat().length;

    const scales: IScale[] = [];

    data.map(({ chapterId, info }) => {
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

  handleScale(scales: IScale[]): IScale[] {
    const listScales: IScale[] = [];

    for (const scale of scales) {
      const index = listScales.findIndex(
        (item: IScale) =>
          item.chapterId === scale.chapterId && item.level === scale.level,
      );

      if (index !== -1) {
        listScales[index].percent += scale.percent;
      } else {
        listScales.push(scale);
      }
    }

    return listScales;
  }

  async generate(data: GenerateExamPaperDto): Promise<ExamEntity[]> {
    const listExams: ExamEntity[] = [];
    const { scales, totalQuestions, numberExams } = data;
    const lesson = await this.lessonService.detailLesson(
      data.lessonId,
      data.createBy,
    );

    delete data.numberExams;

    const listScales: IScale[] = this.handleScale(scales);

    await Promise.all(
      listScales.map(async (scale) => {
        if (
          !lesson.chapters.find((chapter) => chapter.id === scale.chapterId)
        ) {
          throw new BusinessException(
            ErrorEnum.RECORD_NOT_FOUND,
            `Chapter ${scale.chapterId}`,
          );
        }
      }),
    );

    const questsChapter: any[] = await this.questionService.randQuestsByScales(
      listScales,
      totalQuestions,
      data.createBy,
    );

    const listQuestions = questsChapter.map((item) => item.questions).flat();

    for (let i = 0; i < numberExams; i++) {
      // Trộn câu hỏi và đáp án của từng câu
      const mixedQuestions = this.randomQuestions(listQuestions);

      const questions: any[] = this.handleQuestionLabel(
        mixedQuestions,
        data.questionLabel,
        data.answerLabel,
      );

      delete data.id;

      listExams.push(
        new ExamEntity({
          label: data.label,
          time: data.time,
          sku: data.sku + randomNumbs(3),
          status: data.status,
          enable: data.enable,
          maxScore: data.maxScore,
          scales: listScales,
          questions: questions.map((question) => {
            return {
              ...question,
              label: question.label,
            };
          }),
          create_by: data.createBy,
          update_by: data.createBy,
        }),
      );
    }

    const createExams = this.examRepo.create(listExams);

    await this.lessonService.addExams(data.lessonId, createExams);

    return createExams;
  }

  async getScale(questions: ExamQuestionDto[]) {
    const chapter: IChapterQuestion[] = await Promise.all(
      questions.map(async ({ id }) => {
        const { chapterId, question } =
          await this.chapterService.findAvailableQuiz(
            id,
            questions[0].create_by,
          );

        return { chapterId, question };
      }),
    );
    const classify = this.classifyQuestions(chapter);
    return this.getQuestionRate(classify);
  }

  async updateQuiz(quizId: string, data: QuestionEntity) {
    const exams = await this.findByQuestionId(quizId);

    await Promise.all(
      exams.map(async (exam) => {
        const newExam: ExamEntity = exam;
        let quizLabel = '';
        let quizzes: any = exam.questions.filter((quiz) => {
          if (quiz.id === quizId) {
            quizLabel = quiz.label;
          } else {
            return quiz;
          }
        });

        const handleQuestion = this.randomQuestions([data]);
        const quiz = this.handleQuestionLabel(
          handleQuestion,
          exam.questions[0].label,
          exam.questions[0].answers[0].label,
        )[0];
        quiz['label'] = quizLabel;
        quizzes = _.orderBy([quiz, ...quizzes], ['label'], ['asc']);

        newExam.scales = await this.getScale(quizzes);
        newExam.questions = quizzes;

        await this.lessonService.updateExam(newExam);
      }),
    );
    return true;
  }

  async update(id: string, data: UpdateExamPaperDto): Promise<ExamEntity> {
    const isExisted = await this.findOne(id);
    let listQuestions = [];
    let answerLabel: string = !_.isEmpty(data?.answerLabel)
      ? data.answerLabel
      : null;

    if (isExisted.create_by !== data.updateBy)
      throw new BusinessException(ErrorEnum.NO_PERMISSON, id);

    if (data.questionLabel) {
      const questions: any[] = Array(isExisted.questions.length);
      await Promise.all(
        isExisted.questions.map(async (question, index) => {
          const isQuestion = await this.chapterService.findAvailableQuiz(
            question.id,
            question.create_by,
          );
          if (!answerLabel) {
            answerLabel = question.answers[0].label;
          }
          isQuestion.question['answers'] = question.answers.map(
            (answer) => answer,
          );
          questions[index] = isQuestion.question;
        }),
      );
      listQuestions = this.handleQuestionLabel(
        questions,
        data.questionLabel,
        answerLabel,
      );
    }

    const newExam = new ExamEntity({
      ...isExisted,
      ...(!_.isNil(data.label) && { label: data.label }),
      ...(!_.isNil(data.time) && { time: data.time }),
      ...(!_.isNil(data.questionLabel) && {
        questions: listQuestions.map((question) => {
          return {
            ...question,
            label: question.label,
          };
        }),
      }),
      ...(!_.isNil(data.maxScore) && { maxScore: data.maxScore }),
      ...(!_.isNil(data.status) && {
        status: data.status,
      }),
      ...(!_.isNil(data.enable) && { enable: data.enable }),
      update_by: data.updateBy,
    });

    await this.lessonService.updateExam(newExam);

    return await this.findOne(id);
  }

  async enableExams(data: EnableExamsDto): Promise<ExamEntity[]> {
    const listExams: ExamEntity[] = [];
    await Promise.all(
      data.examsEnable.map(async (examEnable: any) => {
        const isExisted = await this.findOne(examEnable.examId);
        if (isExisted) {
          if (isExisted.create_by !== data.updateBy) {
            throw new BusinessException(
              ErrorEnum.NO_PERMISSON,
              examEnable.examId,
            );
          }
          isExisted.enable = examEnable.enable;
          listExams.push(isExisted);
        }
      }),
    );

    await Promise.all(
      data.examsEnable.map(async ({ examId, enable }) => {
        await this.examRepo.update(
          { id: examId },
          { enable, update_by: data.updateBy },
        );
      }),
    );

    return listExams;
  }

  async deleteMany(ids: string[], uid: string): Promise<string> {
    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.lessonService.findByExamId(id);
        if (isExisted.create_by !== uid) {
          throw new BusinessException(ErrorEnum.NO_PERMISSON, id);
        }
      }),
    );

    for (const itemId of ids) {
      const { id } = await this.lessonService.findByExamId(itemId);
      await this.lessonService.deleteExam(id, itemId);
    }

    return '200:Xóa thành công';
  }
}
