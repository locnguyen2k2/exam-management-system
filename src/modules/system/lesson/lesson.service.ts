import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateLessonDto,
  EnableLessonsDto,
  LessonPageOptions,
} from '~/modules/system/lesson/dtos/lesson-req.dto';
import { LessonPaginationDto } from '~/modules/system/lesson/dtos/lesson-res.dto';
import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { ExamService } from '~/modules/system/exam/exam.service';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { pipeLine } from '~/utils/pipe-line';
import { ClassService } from '~/modules/system/class/class.service';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';

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
  ): Promise<LessonPaginationDto> {
    const filterOptions = {
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),
      // ...(!_.isEmpty(pageOptions.classIds) && {
      //   classIds: { $in: pageOptions.classIds },
      // }),
      ...(!_.isEmpty(pageOptions.lessonStatus) && {
        status: { $in: pageOptions.lessonStatus },
      }),
      ...(uid && {
        $or: [{ create_by: uid }],
      }),
    };

    const pipes = [
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.lessonRepo
      .aggregate(pipes)
      .toArray();

    await Promise.all(
      data.map(async (lesson) => {
        const listClass = await this.classService.findByLesson(lesson.id);
        listClass.forEach((isClass) => {
          delete isClass.lessons;
        });

        lesson['classes'] = listClass;
      }),
    );

    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });

    return new LessonPaginationDto(data, pageMetaDto);
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

    throw new BusinessException(`400:Bản ghi "${id}" không có sẵn!`);
  }

  async detailLesson(id: string, uid: string): Promise<any> {
    return await this.findAvailable(id, uid);
  }

  async findOne(id: string): Promise<LessonEntity> {
    const isExisted = await this.lessonRepo.findOne({ where: { id } });
    if (isExisted) return isExisted;
    throw new BusinessException(`400:Học phần ${id} không tồn tại!`);
  }

  async findByChapter(chapterId: string): Promise<LessonEntity[]> {
    return await this.lessonRepo.find({
      where: {
        'chapters.id': {
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
          throw new BusinessException(
            `400:Tên học phần ${lesson.name} đã tồn tại!`,
          );

        const newLesson = new LessonEntity({
          ...lesson,
          create_by: data.createBy,
          update_by: data.createBy,
        });

        if (!_.isEmpty(lesson.classIds)) {
          for (const classId of lesson.classIds) {
            await this.classService.findAvailableById(classId, data.createBy);
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

  async update(id: string, data: any): Promise<LessonEntity> {
    const isExisted = await this.findOne(id);
    const newClassIds: string[] = [];
    const exams: ExamEntity[] = [];

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException('400:Không thể cập nhật học phần này!');
    }

    if (!_.isNil(data.name)) {
      const isReplaced = await this.findByName(data.name);

      if (
        isReplaced &&
        isReplaced.id !== id &&
        isReplaced.create_by === data.updateBy
      ) {
        throw new BusinessException('400:Tên học phần đã tồn tại!');
      }
    }

    if (!_.isNil(data.examIds)) {
      await Promise.all(
        data.examIds.map(async (examId) => {
          exams.push(await this.examService.findOne(examId));
        }),
      );
    }

    const chapters: ChapterEntity[] = [];

    if (!_.isNil(data.chapterIds)) {
      await Promise.all(
        data.chapterIds.map(async (chapterId) => {
          const chapter = await this.chapterService.findAvailableChapterById(
            chapterId,
            data.createBy,
          );

          const index = chapters.findIndex(({ id }) => id === chapterId);
          if (index === -1) chapters.push(chapter);
        }),
      );
    }

    if (!_.isNil(data.classIds) && data.classIds.length > 0) {
      for (const classId of data.classIds) {
        const newClass = await this.classService.findAvailableById(
          classId,
          data.updateBy,
        );
        if (!newClass.lessons.find((lesson) => lesson.id === id)) {
          const isReplaced = newClassIds.some((itemId) => itemId === classId);
          !isReplaced && newClassIds.push(classId);
        }
      }
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

    const result = await this.findOne(id);

    if (!_.isEmpty(data.classIds)) {
      for (const classId of newClassIds) {
        await this.classService.updateClassLessons(classId, [id]);
      }
    }

    return result;
  }

  async addExams(lessonId: string, examIds: string[]): Promise<boolean> {
    const exams = await Promise.all(
      examIds.map(async (id) => await this.examService.findOne(id)),
    );

    await this.lessonRepo.findOneAndUpdate(
      { id: lessonId },
      {
        $push: { exams: { $each: exams } },
      },
    );
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
              '400:Không có quyền thao tác trên bản ghi này!',
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

  async updateChapters(
    id: string,
    chapters: ChapterEntity[],
  ): Promise<boolean> {
    await this.lessonRepo.update(
      { id },
      {
        chapters: chapters,
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
