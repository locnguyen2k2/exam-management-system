import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { MongoRepository } from 'typeorm';
import { QuestionService } from '~/modules/system/question/question.service';
import { IDetailChapter } from '~/modules/system/chapter/chapter.interface';
import { AnswerService } from '~/modules/system/answer/answer.service';
import {
  CreateExamPaperDto,
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
import { ExamPaginationDto } from '~/modules/system/exam/dtos/exam-res.dto';
import {
  AnswerLabelEnum,
  QuestionLabelEnum,
} from '~/modules/system/exam/enums/label.enum';
import { handleLabel } from '~/utils/label';
import { alphabet } from '~/modules/system/exam/exam.constant';
import { LessonService } from '~/modules/system/lesson/lesson.service';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { pipeLine } from '~/utils/pipe-line';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';

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

  async getExamDetail(id: string) {
    const questions = [];
    const exam = await this.findOne(id);
    const questionIds = exam.questions.flat();
    const answerIds = questionIds.flatMap((question) => question.answerIds);
    const answers = await Promise.all(
      answerIds.map(async (answer) => {
        const isAnswer = await this.answerService.findOne(answer.answerId);
        isAnswer['label'] = answer.label;
        return isAnswer;
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

      for (const answer of answers) {
        const index = isQuestion.correctAnswerIds.findIndex(
          (value) => value.correctAnswerId === answer.id,
        );

        if (index > -1) {
          isQuestion.correctAnswers.push({
            ...answer,
            score: isQuestion.correctAnswerIds[index].score,
          });
        }
      }

      isQuestion.answers = answers.filter((answer) =>
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

  async create(data: CreateExamPaperDto): Promise<ExamEntity[]> {
    const exams: ExamEntity[] = [];
    const lesson = await this.lessonService.findOne(data.lessonId);
    const questionInfo: IDetailChapter[] = await Promise.all(
      data.questionInfo.map(
        async (info) =>
          await this.questionService.validateQuestions(
            data.lessonId,
            info,
            data.createBy,
          ),
      ),
    );
    const questions = questionInfo.map((info) => info.questions).flat();
    const scales = await this.questionService.questionPercentages(questions);

    for (let i = 0; i < data.numberExams; i++) {
      const randomQuestion =
        await this.questionService.randomQuestions(questions);
      const questionLabel = await this.handleQuestionLabel(
        randomQuestion,
        data.questionLabel,
        data.answerLabel,
      );
      const newExam = new ExamEntity({
        label: data.label,
        time: data.time,
        lesson: { lessonId: lesson.id, name: lesson.name },
        sku: data.sku + randomNumbs(3),
        status: data.status,
        enable: data.enable,
        maxScore: data.maxScore,
        scales,
        questions: questionLabel.map((question) => {
          return {
            questionId: question.id,
            label: question.label,
            answerIds: [...question.answerIds],
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
    return await this.examRepo.save(newExams);
  }

  // async countQuestionInExams(questionId: string): Promise<number> {
  //   await this.questionService.findOne(questionId);
  //   return await this.examRepo.countBy({
  //     'questions.questionId': questionId,
  //   });
  // }

  async generate(data: GenerateExamPaperDto): Promise<ExamEntity[]> {
    const listExams: ExamEntity[] = [];
    const { scales, totalQuestions, numberExams } = data;
    const lesson = await this.lessonService.findOne(data.lessonId);

    if (lesson.create_by !== data.createBy)
      throw new BusinessException(
        `400:Khong the truy cap hoc phan "${lesson.name}"!`,
      );

    delete data.numberExams;

    const handledChapters = await Promise.all(
      scales.map(async (scale) => {
        const { chapterId, percent, level } = scale;
        const questionQty = (percent * totalQuestions) / 100;
        // Lấy ngẫu nhiên câu hỏi trong chương theo số lượng
        const { questions, chapter } =
          await this.questionService.randQuestsByChap(
            chapterId,
            level,
            questionQty,
            data.createBy,
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

    const questions = handledChapters.map((item) => item.questions).flat();

    for (let i = 0; i < numberExams; i++) {
      // Trộn câu hỏi và đáp án của từng câu
      const randomQuestion =
        await this.questionService.randomQuestions(questions);

      const questionLabel = await this.handleQuestionLabel(
        randomQuestion,
        data.questionLabel,
        data.answerLabel,
      );

      delete data.id;

      listExams.push(
        new ExamEntity({
          label: data.label,
          time: data.time,
          lesson: { lessonId: lesson.id, name: lesson.name },
          sku: data.sku + randomNumbs(3),
          status: data.status,
          enable: data.enable,
          maxScore: data.maxScore,
          scales: data.scales,
          questions: questionLabel.map((question) => {
            return {
              questionId: question.id,
              label: question.label,
              answerIds: [...question.answerIds],
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

    return await this.examRepo.save(newExams);
  }

  async updateExamsLessonName(lessonId: string, name: string) {
    await this.examRepo.updateMany(
      { 'lesson.lessonId': lessonId },
      { $set: { 'lesson.name': name } },
      { upsert: false },
    );
  }

  async update(id: string, data: UpdateExamPaperDto): Promise<ExamEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted.create_by !== data.updateBy)
      throw new BusinessException('400:Khong co quyen cap nhat ban ghi nay!');

    if (data.lessonId) {
      const newLesson = await this.lessonService.getAvailable(
        data.lessonId,
        data.updateBy,
      );

      if (isExisted.lesson.lessonId !== newLesson.id) {
        const oldLesson = await this.lessonService.getAvailable(
          isExisted.lesson.lessonId,
          data.updateBy,
        );

        const oldNewExams = new Set(oldLesson.examIds);

        oldNewExams.delete(id);

        await this.lessonService.update(isExisted.lesson.lessonId, {
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
              'lesson.name': newLesson.name,
              'lesson.lessonId': newLesson.id,
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

  async delete(id: string, uid: string): Promise<string> {
    const isExisted = await this.findOne(id);
    if (isExisted.create_by !== uid) {
      throw new BusinessException('400:Khong co quyen xoa ban ghi nay!');
    }

    await this.examRepo.deleteOne({ id });
    return '200:Xóa thành công';
  }
}
