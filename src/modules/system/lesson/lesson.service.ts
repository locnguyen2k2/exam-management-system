import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateLessonDto,
  EnableLessonsDto,
  LessonPageOptions,
} from '~/modules/system/lesson/dtos/lesson-req.dto';
import * as _ from 'lodash';
import { LessonDetailDto } from '~/modules/system/lesson/dtos/lesson-res.dto';
import { searchIndexes } from '~/utils/search';
import { BusinessException } from '~/common/exceptions/biz.exception';
// import {
//   regSpecialChars,
//   regWhiteSpace,
// } from '~/common/constants/regex.constant';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { ClassService } from '~/modules/system/class/class.service';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { ErrorEnum } from '~/common/enums/error.enum';
import { paginate } from '~/helpers/paginate/paginate';
import { ExamPaperPageOptions } from '~/modules/system/exam/dtos/exam-req.dto.';

const defaultLookup = [
  {
    $lookup: {
      from: 'chapter_entity',
      localField: 'chapterIds',
      foreignField: 'id',
      as: 'chapters',
    },
  },
  {
    $addFields: {
      chapter: { $arrayElemAt: ['$chapter', 0] },
    },
  },
];

@Injectable()
export class LessonService {
  constructor(
    @Inject(forwardRef(() => ChapterService))
    private readonly chapterService: ChapterService,
    @Inject(forwardRef(() => ClassService))
    private readonly classService: ClassService,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: MongoRepository<LessonEntity>,
  ) {}

  async findAll(
    uid: string,
    pageOptions: LessonPageOptions = new LessonPageOptions(),
  ) {
    const filterOptions = [
      {
        $match: {
          ...(!_.isNil(pageOptions.enable) && {
            enable: pageOptions.enable,
          }),
          ...(!_.isEmpty(pageOptions.lessonStatus) && {
            status: { $all: pageOptions.lessonStatus },
          }),
          ...(uid && {
            $and: [
              {
                create_by: uid,
              },
            ],
          }),
        },
      },
    ];

    const paginated = await paginate(
      this.lessonRepo,
      { pageOptions, filterOptions, lookups: defaultLookup },
      searchIndexes(pageOptions.keyword),
    );

    const detailLessons = new Array(paginated.data.length);

    await Promise.all(
      paginated.data.map(async (lesson, index) => {
        detailLessons[index] = {
          ...lesson,
          classes: await this.classService.findByLesson(lesson.id),
        };
      }),
    );

    return { data: detailLessons, meta: paginated.meta };
  }

  // async findByName(name: string): Promise<LessonEntity> {
  //   const handleContent = name
  //     .replace(regSpecialChars, '\\$&')
  //     .replace(regWhiteSpace, '\\s*');
  //
  //   const isExisted = await this.lessonRepo.findOneBy({
  //     name: { $regex: handleContent, $options: 'i' },
  //   });
  //
  //   if (isExisted) return isExisted;
  // }

  async findAvailable(id: string, uid: string): Promise<LessonEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted.create_by === uid) return isExisted;

    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
  }

  async detailLesson(id: string, uid: string): Promise<LessonDetailDto> {
    await this.findAvailable(id, uid);
    const isExisted = (
      await this.lessonRepo
        .aggregate([
          ...defaultLookup,
          {
            $match: { id: id },
          },
        ])
        .toArray()
    )[0];

    const listClass = await this.classService.findByLesson(isExisted.id);
    listClass.forEach((isClass) => {
      delete isClass.lessons;
    });

    isExisted['classes'] = listClass;
    isExisted['classes'] = await this.classService.findByLesson(isExisted.id);
    return isExisted;
  }

  async findOne(id: string): Promise<LessonEntity> {
    const isExisted = await this.lessonRepo.findOne({ where: { id } });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async findByChapter(chapterId: string): Promise<LessonEntity> {
    return await this.lessonRepo.findOne({
      where: {
        chapterIds: {
          $in: [chapterId],
        },
      },
    });
  }

  async paginateExams(
    lessonId: string,
    pageOptions: ExamPaperPageOptions = new ExamPaperPageOptions(),
    uid: string,
  ) {
    const filterOptions = [
      {
        $unwind: '$exams',
      },
      {
        $match: {
          id: lessonId,
          ...(!_.isNil(pageOptions.enable) && {
            'exams.enable': pageOptions.enable,
          }),
          ...(!_.isEmpty(pageOptions.examStatus) && {
            'exams.status': { $in: pageOptions.examStatus },
          }),
          ...(!_.isNil(pageOptions.examSku) && {
            'exams.sku': {
              $regex: new RegExp(`^${pageOptions.examSku}\\d{3}$`, 'i'),
            },
          }),
          ...(uid && {
            $and: [
              {
                create_by: uid,
              },
            ],
          }),
        },
      },
      { $skip: pageOptions.skip },
      { $limit: pageOptions.take },
      {
        $sort: {
          [`exams.${pageOptions.sort}`]: !pageOptions.sorted ? -1 : 1,
        },
      },
    ];

    const groups = [{ $group: { _id: null, exams: { $push: '$exams' } } }];

    return await paginate(
      this.lessonRepo,
      {
        filterOptions,
        groups,
        pageOptions,
        lookups: null,
      },
      searchIndexes(pageOptions.keyword),
    );
  }

  async create(data: CreateLessonDto): Promise<LessonEntity[]> {
    let listLessons: LessonEntity[] = [];
    // Danh sách lớp học có học phần
    const classLessons: { classId: string; lessons: LessonEntity[] }[] = [];

    await Promise.all(
      data.items.map(async (lesson) => {
        if (_.isEmpty(lesson.classIds))
          throw new BusinessException('400:Vui lòng thêm mã lớp!');

        const newLesson = new LessonEntity({
          ...lesson,
          create_by: data.createBy,
          update_by: data.createBy,
        });

        for (const classId of lesson.classIds) {
          // Kiểm tra lớp học phải tồn tại và được tạo bởi người dùng
          await this.classService.findAvailable(classId, data.createBy);

          const index = classLessons.findIndex(
            (item) => item.classId === classId,
          );

          if (index !== -1) {
            classLessons[index].lessons.push(newLesson);
          } else {
            classLessons.push({
              classId: classId,
              lessons: [newLesson],
            });
          }
        }

        listLessons.push(newLesson);
      }),
    );

    const newLessons = this.lessonRepo.create(listLessons);

    listLessons = await this.lessonRepo.save(newLessons);

    for (const classLesson of classLessons) {
      await this.classService.addLessons(
        classLesson.classId,
        classLesson.lessons,
      );
    }

    return listLessons;
  }

  async findByExamId(examId: string): Promise<LessonEntity> {
    const isLesson = await this.lessonRepo.findOne({
      where: {
        'exams.id': {
          $in: [examId],
        },
      },
    });

    if (!isLesson)
      throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, examId);

    return isLesson;
  }

  async findByExamSku(examSku: string): Promise<LessonEntity> {
    const isLesson = await this.lessonRepo.findOne({
      where: {
        'exams.sku': {
          $regex: new RegExp(`^${examSku}\\d{3}$`, 'i'),
        },
      },
    });

    return isLesson;
  }

  async findExamsByQuiz(quizId: string): Promise<LessonEntity[]> {
    return await this.lessonRepo.find({
      where: {
        'exams.questions.id': {
          $in: [quizId],
        },
      },
    });
  }

  async updateExam(exam: ExamEntity) {
    const isLesson = await this.findByExamId(exam.id);
    const newExams = isLesson.exams.filter(({ id }) => id !== exam.id);

    await this.lessonRepo.update(
      {
        id: isLesson.id,
      },
      {
        exams: [...newExams, exam],
      },
    );

    await this.classService.updateExamsByLessonId(isLesson.id, [
      ...newExams,
      exam,
    ]);
  }

  async deleteExam(lessonId: string, examId: string) {
    const isLesson = await this.findOne(lessonId);
    const newExams = isLesson.exams.filter((exam) => exam.id !== examId);

    await this.lessonRepo.findOneAndUpdate(
      {
        id: lessonId,
        exams: {
          $elemMatch: {
            id: examId,
          },
        },
      },
      {
        $pull: {
          exams: { id: examId },
        },
      },
    );

    await this.classService.updateExamsByLessonId(lessonId, newExams);

    return true;
  }

  async update(id: string, data: any): Promise<LessonDetailDto> {
    await this.findAvailable(id, data.updateBy);

    const exams: ExamEntity[] = [];
    const newClassIds: string[] = [];
    const oldClassIds: string[] = [];
    const chapters: ChapterEntity[] = [];

    if (!_.isNil(data.examIds)) {
      await Promise.all(
        data.examIds.map(async (examId: string) => {
          const isExam = await this.findByExamId(examId);
          exams.push(isExam.exams.find((exam) => exam.id === examId));
        }),
      );
    }

    if (!_.isNil(data.chapterIds)) {
      await Promise.all(
        data.chapterIds.map(async (chapterId: string) => {
          const chapter = await this.chapterService.findAvailable(
            chapterId,
            data.createBy,
          );

          const index = chapters.findIndex(({ id }) => id === chapterId);
          if (index === -1) chapters.push(chapter);
        }),
      );
    }

    if (!_.isNil(data.classIds) && data.classIds.length > 0) {
      await Promise.all(
        data.classIds.map(async (classId: string) => {
          const newClass = await this.classService.findAvailable(
            classId,
            data.updateBy,
          );

          if (!newClass.lessons.find((lesson) => lesson.id === id)) {
            const isReplaced = newClassIds.some((itemId) => itemId === classId);
            !isReplaced && newClassIds.push(classId);
          }
        }),
      );

      const oldClasses = await this.classService.findByLesson(id);
      oldClasses.map((oldClass) => {
        !data.classIds.includes(oldClass.id) && oldClassIds.push(oldClass.id);
      });
    }

    if (!_.isNil(data.examIds)) {
      await this.classService.updateExamsByLessonId(id, exams);
    }

    await this.lessonRepo.update(
      { id },
      {
        ...(!_.isNil(data.name) && { name: data.name }),
        ...(!_.isNil(data.label) && { label: data.label }),
        ...(!_.isNil(data.description) && { description: data.description }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        ...(!_.isNil(data.status) && { status: data.status }),
        ...(!_.isEmpty(data.chapterIds) && { chapters }),
        ...(!_.isNil(data.examIds) && { exams: exams }),
        update_by: data.updateBy,
      },
    );

    const newLesson = await this.findOne(id);

    if (!_.isEmpty(data.classIds)) {
      await this.classService.deleteLesson(oldClassIds, newLesson.id);

      await Promise.all(
        newClassIds.map(async (classId) => {
          await this.classService.addLessons(classId, [newLesson]);
        }),
      );
    }

    return await this.detailLesson(id, data.updateBy);
  }

  async addExams(lessonId: string, exams: ExamEntity[]): Promise<boolean> {
    await this.findAvailable(lessonId, exams[0].create_by);

    await this.lessonRepo.findOneAndUpdate(
      { id: lessonId },
      {
        $push: { exams: { $each: exams } },
      },
    );

    await this.classService.addLessonExams(lessonId, exams);

    return true;
  }

  async enableLessons(data: EnableLessonsDto): Promise<LessonEntity[]> {
    const listLessons: LessonEntity[] = [];
    await Promise.all(
      data.lessonsEnable.map(async (lessonEnable: any) => {
        const isExisted = await this.findOne(lessonEnable.lessonId);
        if (isExisted) {
          if (isExisted.create_by !== data.updateBy) {
            throw new BusinessException(
              ErrorEnum.NO_PERMISSON,
              lessonEnable.lessonId,
            );
          }
          isExisted.enable = lessonEnable.enable;
          listLessons.push(isExisted);
        }
      }),
    );

    await Promise.all(
      data.lessonsEnable.map(async ({ lessonId, enable }) => {
        await this.lessonRepo.update(
          { id: lessonId },
          { enable, update_by: data.updateBy },
        );
      }),
    );

    return listLessons;
  }

  async updateChapters(id: string, chapterIds: string[]): Promise<boolean> {
    await this.lessonRepo.update(
      { id },
      {
        chapterIds: chapterIds,
      },
    );

    return true;
  }

  async deleteMany(ids: string[], uid: string) {
    await Promise.all(
      ids.map(async (lessonId) => {
        await this.findAvailable(lessonId, uid);

        const listClass = await this.classService.findByLesson(lessonId);
        const classIds = listClass.map(({ id }) => id);

        await this.classService.deleteLesson(classIds, lessonId);
      }),
    );

    await this.lessonRepo.deleteMany({
      id: {
        $in: ids,
      },
    });

    return '200:Xóa thành công!';
  }
}
