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
import { ChapterService } from '~/modules/system/chapter/chapter.service';
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
import { StatusShareEnum } from '~/common/enums/status-share.enum';
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
    private readonly chapterService: ChapterService,
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

  async getExamDetail(id: string): Promise<ExamDetailDto> {
    const questions = [];
    const exam: any = await this.findOne(id);
    const questionIds = exam.questions.flat();
    const lesson = await this.lessonService.findOne(exam.lessonId);

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

    exam.lesson = lesson;
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

  async handleQuestionLabel(
    questions: QuestionEntity[],
    questionLabel: QuestionLabelEnum,
    answerLabel: AnswerLabelEnum,
  ) {
    return await Promise.all(
      questions.map((question, index) => {
        const answerIds = question.answerIds.map((answerId, index) => {
          const chars = alphabet.split('');
          const label = handleLabel(answerLabel, `${chars[index]}`);

          return { answerId, label };
        });

        return {
          ...question,
          answerIds,
          label: handleLabel(questionLabel, `${index + 1}`),
        };
      }),
    );
  }

  async create(data: CreateExamPaperDto): Promise<ExamDetailDto[]> {
    const exams: ExamEntity[] = [];
    const lesson = await this.lessonService.findAvailable(
      data.lessonId,
      data.createBy,
    );
    const questsInfo: IDetailChapter[] = await Promise.all(
      data.questionInfo.map(
        async (info) =>
          await this.questionService.validateQuestions(
            data.lessonId,
            info,
            data.createBy,
          ),
      ),
    );
    const listQuestions = questsInfo.map((info) => info.questions).flat();
    const scales =
      await this.questionService.questionPercentages(listQuestions);

    for (let i = 0; i < data.numberExams; i++) {
      const mixedQuestions =
        await this.questionService.randomQuestions(listQuestions);
      const questions = await this.handleQuestionLabel(
        mixedQuestions,
        data.questionLabel,
        data.answerLabel,
      );
      const newExam = new ExamEntity({
        label: data.label,
        time: data.time,
        lessonId: lesson.id,
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
        create_by: data.createBy,
        update_by: data.createBy,
      });

      exams.push(newExam);
    }

    const newExams = this.examRepo.create(exams);
    await this.lessonService.update(data.lessonId, {
      ...lesson,
      examIds: [...lesson.examIds, ...newExams.map((exam) => exam.id)],
      updateBy: data.createBy,
    });
    await this.examRepo.save(newExams);

    return await Promise.all(
      newExams.map(async (exam) => await this.getExamDetail(exam.id)),
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

      const questions = await this.handleQuestionLabel(
        mixedQuestions,
        data.questionLabel,
        data.answerLabel,
      );

      delete data.id;

      listExams.push(
        new ExamEntity({
          label: data.label,
          time: data.time,
          lessonId: lesson.id,
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

    const newExams = this.examRepo.create(listExams);
    await this.lessonService.update(data.lessonId, {
      ...lesson,
      examIds: [...lesson.examIds, ...newExams.map((exam) => exam.id)],
      updateBy: data.createBy,
    });
    await this.examRepo.save(newExams);

    return await Promise.all(
      newExams.map(async (exam) => await this.getExamDetail(exam.id)),
    );
  }

  // async updateExamsLessonName(lessonId: string, name: string) {
  //   await this.examRepo.updateMany(
  //     { 'lesson.lessonId': lessonId },
  //     { $set: { 'lesson.name': name } },
  //     { upsert: false },
  //   );
  // }

  async update(id: string, data: UpdateExamPaperDto): Promise<ExamEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException(
        '400:Không có quyền thao tác trên bản ghi này!',
      );
    }

    if (data.lessonId) {
      const newLesson = await this.lessonService.findAvailable(
        data.lessonId,
        data.updateBy,
      );

      if (isExisted.lessonId !== newLesson.id) {
        const oldLesson = await this.lessonService.findAvailable(
          isExisted.lessonId,
          data.updateBy,
        );

        const oldNewExams = new Set(oldLesson.examIds);

        oldNewExams.delete(id);

        await this.lessonService.update(isExisted.lessonId, {
          ...oldLesson,
          examIds: [...oldNewExams],
        });

        await this.lessonService.update(newLesson.id, {
          ...newLesson,
          examIds: [...newLesson.examIds, id],
        });

        await this.examRepo.updateMany(
          { id: id },
          {
            $set: {
              lessonId: newLesson.id,
            },
          },
          { upsert: false },
        );
      }
    }

    await this.examRepo.update(
      { id },
      {
        ...(!_.isNil(data.label) && { label: data.label }),
        ...(!_.isNil(data.time) && { time: data.time }),
        ...(!_.isNil(data.questionLabel) && {
          questionLabel: data.questionLabel,
        }),
        ...(!_.isNil(data.answerLabel) && { answerLabel: data.answerLabel }),
        ...(!_.isNil(data.maxScore) && { maxScore: data.maxScore }),
        ...(!_.isNil(data.status) && {
          status: data.status,
        }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        update_by: data.updateBy,
      },
    );

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

  async delete(id: string, uid: string): Promise<string> {
    const isExisted = await this.findOne(id);
    if (isExisted.create_by !== uid) {
      throw new BusinessException('400:Khong co quyen xoa ban ghi nay!');
    }

    await this.examRepo.deleteOne({ id });
    return '200:Xóa thành công';
  }
}
