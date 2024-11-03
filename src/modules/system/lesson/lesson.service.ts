import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateLessonDto,
  EnableLessonsDto,
  LessonPageOptions,
} from '~/modules/system/lesson/dtos/lesson-req.dto';
import { LessonDetailDto } from '~/modules/system/lesson/dtos/lesson-res.dto';
import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import { BusinessException } from '~/common/exceptions/biz.exception';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { ExamService } from '~/modules/system/exam/exam.service';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { ClassService } from '~/modules/system/class/class.service';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { ErrorEnum } from '~/common/enums/error.enum';
import { paginate } from '~/helpers/paginate/paginate';

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
    @Inject(forwardRef(() => ExamService))
    private readonly examService: ExamService,
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

    const detailLessons = [];

    await Promise.all(
      paginated.data.map(async (lesson) => {
        const listClass = await this.classService.findByLesson(lesson.id);

        const detailLesson = {
          ...lesson,
          classes: listClass,
        };
        detailLessons.push(detailLesson);
      }),
    );

    return { data: detailLessons, meta: paginated.meta };
  }

  async findByName(name: string): Promise<LessonEntity> {
    const handleContent = name
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');

    const isExisted = await this.lessonRepo.findOneBy({
      name: { $regex: handleContent, $options: 'i' },
    });

    if (isExisted) return isExisted;
  }

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

  async findByChapter(chapterId: string): Promise<LessonEntity[]> {
    return await this.lessonRepo.find({
      where: {
        chapterIds: {
          $all: [chapterId],
        },
      },
    });
  }

  async create(data: CreateLessonDto): Promise<LessonEntity[]> {
    let listLessons: LessonEntity[] = [];
    const classLessons: { classId: string; lessonIds: string[] }[] = [];

    await Promise.all(
      data.items.map(async (lesson) => {
        const isExisted = await this.findByName(lesson.name);

        if (isExisted && isExisted.create_by === data.createBy)
          throw new BusinessException(ErrorEnum.RECORD_EXISTED, lesson.name);

        const newLesson = new LessonEntity({
          ...lesson,
          create_by: data.createBy,
          update_by: data.createBy,
        });

        if (!_.isEmpty(lesson.classIds)) {
          for (const classId of lesson.classIds) {
            await this.classService.findAvailable(classId, data.createBy);
            const index = classLessons.findIndex(
              (classLesson) => classLesson.classId === classId,
            );
            if (index !== -1) {
              classLessons[index].lessonIds.push(newLesson.id);
            } else {
              classLessons.push({
                classId: classId,
                lessonIds: [newLesson.id],
              });
            }
          }
        }

        listLessons.push(newLesson);
      }),
    );

    const newLessons = this.lessonRepo.create(listLessons);

    listLessons = await this.lessonRepo.save(newLessons);

    for (const classLesson of classLessons) {
      await this.classService.updateClassLessons(
        classLesson.classId,
        classLesson.lessonIds,
      );
    }

    return listLessons;
  }

  async findByExamId(examId: string): Promise<LessonEntity> {
    return await this.lessonRepo.findOne({
      where: {
        'exams.id': {
          $in: [examId],
        },
      },
    });
  }

  async update(id: string, data: any): Promise<LessonDetailDto> {
    const isExisted = await this.findOne(id);
    const newClassIds: string[] = [];
    const oldClassIds: string[] = [];
    const exams: ExamEntity[] = [];

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException(ErrorEnum.NO_PERMISSON, id);
    }

    if (!_.isNil(data.name)) {
      const isReplaced = await this.findByName(data.name);

      if (
        isReplaced &&
        isReplaced.id !== id &&
        isReplaced.create_by === data.updateBy
      ) {
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.name);
      }
    }

    if (!_.isNil(data.examIds)) {
      await Promise.all(
        data.examIds.map(async (examId) => {
          const isExam = await this.findByExamId(examId);
          exams.push(isExam.exams.find((exam) => exam.id === examId));
        }),
      );
    }

    const chapters: ChapterEntity[] = [];

    if (!_.isNil(data.chapterIds)) {
      await Promise.all(
        data.chapterIds.map(async (chapterId) => {
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
        data.classIds.map(async (classId) => {
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
    }

    if (!_.isNil(data.examIds)) {
      await this.classService.updateLessonExams(id, exams);
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

    const result = await this.detailLesson(id, data.updateBy);

    if (!_.isEmpty(data.classIds)) {
      await Promise.all(
        newClassIds.map(async (classId) => {
          await this.classService.updateClassLessons(classId, [id]);
        }),
      );
    }

    return result;
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

  // async updateLessonClasses(
  //   id: string,
  //   classIds: string[],
  // ): Promise<LessonEntity> {
  //   const isExisted = await this.findOne(id);
  //
  //   const { affected } = await this.lessonRepo.update(
  //     { id },
  //     {
  //       ...{ classIds: classIds },
  //     },
  //   );
  //
  //   return affected === 0 ? isExisted : await this.findOne(id);
  // }
}
