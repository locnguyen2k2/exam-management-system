import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { MongoRepository } from 'typeorm';
import { QuestionService } from '~/modules/system/question/question.service';
import { IDetailChapter } from '~/modules/system/chapter/chapter.interface';
import { AnswerService } from '~/modules/system/answer/answer.service';
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
import { searchAtlas } from '~/utils/search';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import {
  ExamDetailDto,
  ExamPaginationDto,
} from '~/modules/system/exam/dtos/exam-res.dto';
import {
  AnswerLabelEnum,
  QuestionLabelEnum,
} from '~/modules/system/exam/enums/label.enum';
import { handleLabel } from '~/utils/label';
import { alphabet } from '~/modules/system/exam/exam.constant';
import { LessonService } from '~/modules/system/lesson/lesson.service';
import { pipeLine } from '~/utils/pipe-line';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';

@Injectable()
export class ExamService {
  constructor(
    @Inject(forwardRef(() => LessonService))
    private readonly lessonService: LessonService,
    @InjectRepository(ExamEntity)
    private readonly examRepo: MongoRepository<ExamEntity>,
    private readonly questionService: QuestionService,
    private readonly answerService: AnswerService,
  ) {}

  async findAll(
    uid: string = null,
    pageOptions: ExamPaperPageOptions = new ExamPaperPageOptions(),
  ): Promise<ExamPaginationDto> {
    const filterOptions = {
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),
      ...(!_.isEmpty(pageOptions.examStatus) && {
        status: { $in: pageOptions.examStatus },
      }),
      // ...(!_.isEmpty(pageOptions.lessonIds) && {
      //   lessonId: { $in: pageOptions.lessonIds },
      // }),
      ...(uid && {
        $or: [{ create_by: uid }],
      }),
    };

    const pipes = [
      searchAtlas('searchExams', pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.examRepo
      .aggregate(pipes)
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });

    return new ExamPaginationDto(entities, pageMetaDto);
  }

  async getExamDetail(id: string, uid?: string): Promise<ExamDetailDto> {
    const questions = [];
    const exam: any = await this.findOne(id);
    const questionIds = exam.questions.flat();

    if (uid && exam.create_by !== uid)
      throw new BusinessException(`400:Đề thi không có sẵn!`);

    await Promise.all(
      questionIds.map(async (question: any) => {
        const answers = question.answers;
        for (let i = 0; i < answers.length; i++) {
          const isAnswer = await this.answerService.findOne(
            answers[i].answerId,
          );
          isAnswer['label'] = answers[i].label;
          question.answers[i] = isAnswer;
        }
      }),
    );

    for (let i = 0; i < questionIds.length; i++) {
      const question = questionIds[i];
      const isQuestion = {
        ...(await this.questionService.findOne(question.questionId)),
        answers: [],
        correctAnswers: [],
      };

      isQuestion['label'] = question.label;

      for (const answer of question.answers) {
        const index = isQuestion.correctAnswerIds.findIndex(
          (value) => value.correctAnswerId === answer.id,
        );

        if (index !== -1) {
          isQuestion.correctAnswers.push({
            ...answer,
            score: isQuestion.correctAnswerIds[index].score,
          });
        }
      }

      isQuestion.answers = question.answers.filter((answer: AnswerEntity) =>
        isQuestion.answerIds.includes(answer.id),
      );

      delete isQuestion.answerIds;
      delete isQuestion.correctAnswerIds;

      questions.push(isQuestion);
    }

    exam.questions = questions;

    return exam;
  }

  async findOne(id: string): Promise<ExamEntity> {
    const isExisted = await this.examRepo.findOne({ where: { id } });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async findByQuestionId(questionId: string): Promise<ExamEntity[]> {
    return await this.examRepo.find({
      where: {
        questionIds: {
          $all: [questionId],
        },
      },
    });
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
      let answerIds = [];

      answerIds = this.handleAnswersLabel(question.answerIds, answerLabel);

      return {
        ...question,
        answerIds,
        label: handleLabel(questionLabel, `${index + 1}`),
      };
    });
  }

  async create(data: CreateExamPaperDto): Promise<ExamDetailDto[]> {
    const { lessonId, createBy } = data;
    await this.lessonService.findAvailable(lessonId, createBy);
    const exams: ExamEntity[] = [];
    const questsInfo: IDetailChapter[] = await Promise.all(
      data.questionInfo.map(
        async (info) =>
          await this.questionService.validateQuestions(
            lessonId,
            info,
            createBy,
          ),
      ),
    );
    const listQuestions = questsInfo.map((info) => info.questions).flat();
    const scales = await this.questionService.getQuestionRate(listQuestions);

    for (let i = 0; i < data.numberExams; i++) {
      const randQuestions =
        await this.questionService.randomQuestions(listQuestions);
      const questions = this.handleQuestionLabel(
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
            questionId: question.id,
            label: question.label,
            correctAnswers: question.correctAnswerIds,
            answers: [...question.answerIds],
          };
        }),
        create_by: createBy,
        update_by: createBy,
      });

      exams.push(newExam);
    }

    const createExams = this.examRepo.create(exams);
    const newExams = await this.examRepo.save(createExams);

    await this.lessonService.addExams(
      lessonId,
      newExams.map((exam) => exam.id),
    );

    return await Promise.all(
      newExams.map(async ({ id }) => await this.getExamDetail(id)),
    );
  }

  // async countQuestionInExams(questionId: string): Promise<number> {
  //   await this.questionService.findOne(questionId);
  //   return await this.examRepo.countBy({
  //     'questions.questionId': questionId,
  //   });
  // }

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

  async generate(data: GenerateExamPaperDto): Promise<ExamDetailDto[]> {
    const listExams: ExamEntity[] = [];
    const { scales, totalQuestions, numberExams } = data;
    const lesson = await this.lessonService.findAvailable(
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
            `400:Không có chương ${scale.chapterId} trong học phần này!`,
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
      const mixedQuestions =
        await this.questionService.randomQuestions(listQuestions);

      const questions = this.handleQuestionLabel(
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
              questionId: question.id,
              label: question.label,
              correctAnswers: question.correctAnswerIds,
              answers: [...question.answerIds],
            };
          }),
          create_by: data.createBy,
          update_by: data.createBy,
        }),
      );
    }

    const createExams = this.examRepo.create(listExams);
    const newExams = await this.examRepo.save(createExams);

    await this.lessonService.addExams(
      data.lessonId,
      newExams.map(({ id }) => id),
    );

    return await Promise.all(
      newExams.map(async (exam) => await this.getExamDetail(exam.id)),
    );
  }

  async update(id: string, data: UpdateExamPaperDto): Promise<ExamEntity> {
    const isExisted = await this.findOne(id);
    let listQuestions = [];
    let answerLabel: string = !_.isEmpty(data?.answerLabel)
      ? data.answerLabel
      : null;

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException(
        '400:Không có quyền thao tác trên bản ghi này!',
      );
    }

    if (data.questionLabel) {
      const questions: QuestionEntity[] = Array(isExisted.questions.length);
      await Promise.all(
        isExisted.questions.map(async (question, index) => {
          const isQuestion = await this.questionService.findOne(
            question.questionId,
          );
          if (!answerLabel) {
            answerLabel = question.answers[0].label;
          }
          isQuestion['answerIds'] = question.answers.map(
            ({ answerId }) => answerId,
          );
          questions[index] = isQuestion;
        }),
      );
      listQuestions = this.handleQuestionLabel(
        questions,
        data.questionLabel,
        answerLabel,
      );
    }

    await this.examRepo.update(
      { id },
      {
        ...(!_.isNil(data.label) && { label: data.label }),
        ...(!_.isNil(data.time) && { time: data.time }),
        ...(!_.isNil(data.questionLabel) && {
          questions: listQuestions.map((question) => {
            return {
              questionId: question.id,
              label: question.label,
              correctAnswers: question.correctAnswerIds,
              answers: [...question.answerIds],
            };
          }),
        }),
        ...(!_.isNil(data.maxScore) && { maxScore: data.maxScore }),
        ...(!_.isNil(data.status) && {
          status: data.status,
        }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        update_by: data.updateBy,
      },
    );

    const result = await this.findOne(id);

    const lesson = await this.lessonService.findByExamId(result.id);

    const newExams = lesson.exams.filter((exam) => exam.id !== result.id);
    newExams.push(result);

    await this.lessonService.update(lesson.id, {
      examIds: newExams.map((exam) => exam.id),
      updateBy: data.updateBy,
    });

    return result;
  }

  async enableExams(data: EnableExamsDto): Promise<ExamEntity[]> {
    const listExams: ExamEntity[] = [];
    await Promise.all(
      data.examsEnable.map(async (examEnable: any) => {
        const isExisted = await this.findOne(examEnable.examId);
        if (isExisted) {
          if (isExisted.create_by !== data.updateBy) {
            throw new BusinessException(
              '400:Không có quyền thao tác trên bản ghi này!',
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
        const isExisted = await this.findOne(id);
        if (isExisted.create_by !== uid) {
          throw new BusinessException(`400:Không có quyền xóa bản ghi ${id}!`);
        }
      }),
    );

    for (const itemId of ids) {
      const { exams, id } = await this.lessonService.findByExamId(itemId);
      if (exams && exams.length > 0) {
        const newExams = exams.filter((exam) => exam.id !== itemId);
        await this.lessonService.update(id, {
          examIds: newExams.map((exam) => exam.id),
          updateBy: uid,
        });
      }
    }

    await this.examRepo.deleteMany({ id: { $in: ids } });
    return '200:Xóa thành công';
  }
}
