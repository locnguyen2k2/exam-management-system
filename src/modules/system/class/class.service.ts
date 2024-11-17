import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';
import {
  ClassPageOptions,
  CreateClassDto,
  UpdateClassDto,
} from '~/modules/system/class/dtos/class-req.dto';
import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { LessonService } from '~/modules/system/lesson/lesson.service';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { paginate } from '~/helpers/paginate/paginate';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: MongoRepository<ClassEntity>,
    @Inject(forwardRef(() => LessonService))
    private readonly lessonService: LessonService,
  ) {}

  async findAll(
    uid: string = null,
    pageOptions: ClassPageOptions = new ClassPageOptions(),
  ) {
    const filterOptions = [
      {
        $match: {
          ...(!_.isNil(pageOptions.enable) && {
            enable: pageOptions.enable,
          }),
          ...(!_.isEmpty(pageOptions.classStatus) && {
            status: { $in: pageOptions.classStatus },
          }),
          ...(!_.isEmpty(pageOptions.lessonIds) && {
            'lessons.id': { $all: pageOptions.lessonIds },
          }),
          ...(uid && {
            $or: [{ create_by: uid }],
          }),
        },
      },
    ];

    return paginate(
      this.classRepo,
      { pageOptions, filterOptions },
      searchIndexes(pageOptions.keyword),
    );
  }

  async findOne(id: string): Promise<ClassEntity> {
    const isExisted = await this.classRepo.findOneBy({ id });

    if (isExisted) return isExisted;

    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  // async findByName(name: string): Promise<ClassEntity> {
  //   const handleContent = name
  //     .replace(regSpecialChars, '\\$&')
  //     .replace(regWhiteSpace, '\\s*');
  //
  //   const isExisted = await this.classRepo.findOneBy({
  //     name: { $regex: handleContent, $options: 'i' },
  //   });
  //
  //   if (isExisted) return isExisted;
  // }

  async findByLesson(lessonId: string): Promise<ClassEntity[]> {
    return await this.classRepo.find({ 'lessons.id': { $in: [lessonId] } });
  }

  async findAvailable(id: string, uid?: string): Promise<ClassEntity> {
    const isExisted = await this.findOne(id);

    if (!uid || (uid && isExisted.create_by === uid)) return isExisted;

    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
  }

  async findByCode(code: string): Promise<ClassEntity> {
    const handleContent = code
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');

    const isExisted = await this.classRepo.findOneBy({
      code: { $regex: handleContent, $options: 'i' },
    });

    if (isExisted) return isExisted;
  }

  async create(data: CreateClassDto): Promise<ClassEntity> {
    const lessons: LessonEntity[] = [];
    // const isExisted = await this.findByName(data.name);
    //
    // if (isExisted && isExisted.create_by === data.createBy)
    //   throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.name);

    const isReplaced = await this.findByCode(data.code);

    if (isReplaced && isReplaced.create_by === data.createBy)
      throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.code);

    const item = new ClassEntity({
      ...data,
      create_by: data.createBy,
      update_by: data.createBy,
    });

    if (data.lessonIds && data.lessonIds.length > 0) {
      for (const lessonId of data.lessonIds) {
        lessons.push(
          await this.lessonService.findAvailable(lessonId, data.createBy),
        );
      }
    }

    const newItem = this.classRepo.create({ ...item, lessons });

    return await this.classRepo.save(newItem);
  }

  async addLessonExams(lessonId: string, exams: ExamEntity[]) {
    const listClass = await this.findByLesson(lessonId);

    await Promise.all(
      listClass.map(async ({ id }) => {
        await this.classRepo.findOneAndUpdate(
          { id, 'lessons.id': lessonId },
          {
            $push: {
              'lessons.$.exams': { $each: exams },
            },
          },
        );
      }),
    );
  }

  // Cập nhật danh sách đề thi với mã học phần
  async updateExamsByLessonId(lessonId: string, exams: ExamEntity[]) {
    const listClass = await this.findByLesson(lessonId);

    await Promise.all(
      listClass.map(async ({ id }) => {
        await this.classRepo.findOneAndUpdate(
          { id: id, 'lessons.id': lessonId },
          {
            $set: {
              'lessons.$.exams': exams,
            },
          },
        );
      }),
    );
  }

  async update(id: string, data: UpdateClassDto): Promise<ClassEntity> {
    const isExisted = await this.findAvailable(id, data.updateBy);
    const lessons: LessonEntity[] = [];

    // if (!_.isEmpty(data.name)) {
    //   const isReplaced = await this.findByName(data.name);
    //
    //   if (
    //     isReplaced &&
    //     isExisted.id !== isReplaced.id &&
    //     isExisted.create_by === data.updateBy
    //   )
    //     throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.name);
    // }

    if (!_.isEmpty(data.code)) {
      const isReplaced = await this.findByCode(data.code);

      if (
        isReplaced &&
        isExisted.id !== isReplaced.id &&
        isReplaced.create_by === data.updateBy
      )
        throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.code);
    }

    if (data.lessonIds && data.lessonIds.length > 0) {
      for (const lessonId of data.lessonIds) {
        const isLesson = await this.lessonService.findAvailable(
          lessonId,
          data.updateBy,
        );
        const isReplaced = lessons.some((lesson) => lesson.id === lessonId);
        if (!isReplaced) lessons.push(isLesson);
      }
    }

    // if (lessonIds.length > 0) {
    //   const oldLessonIds: string[] = [];
    //
    //   for (const oldLessonId of isExisted.lessonIds) {
    //     !lessonIds.includes(oldLessonId) && oldLessonIds.push(oldLessonId);
    //   }

    //   if (oldLessonIds.length > 0) {
    //     for (const oldLessonId of oldLessonIds) {
    //       const isLesson = await this.lessonService.findOne(oldLessonId);
    //       const newClassIds = isLesson.classIds.filter(
    //         (oldClassId) => oldClassId !== id,
    //       );
    //
    //       await this.lessonService.updateLessonClasses(
    //         isLesson.id,
    //         newClassIds,
    //       );
    //     }
    //   }
    //
    //   for (const newLessonId of lessonIds) {
    //     const isLesson = await this.lessonService.findOne(newLessonId);
    //
    //     if (!isLesson.classIds.includes(id)) {
    //       const classesInLesson = [...isLesson.classIds, id];
    //       await this.lessonService.updateLessonClasses(
    //         isLesson.id,
    //         classesInLesson,
    //       );
    //     }
    //   }
    // }

    await this.classRepo.update(
      { id },
      {
        ...(!_.isEmpty(data.name) && { name: data.name }),
        ...(!_.isNil(data.description) && { description: data.description }),
        ...(!_.isEmpty(data.code) && { code: data.code }),
        ...(!_.isEmpty(data.startYear) && { startYear: data.startYear }),
        ...(!_.isEmpty(data.endYear) && { endYear: data.endYear }),
        ...(!_.isEmpty(lessons) && { lessons }),
        ...(!_.isNil(data.status) && {
          status: data.status,
        }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        update_by: data.updateBy,
        updated_at: data.updated_at,
      },
    );

    return await this.findOne(id);
  }

  async addLessons(id: string, lessons: LessonEntity[]): Promise<ClassEntity> {
    for (const lesson of lessons) {
      await this.classRepo.findOneAndUpdate(
        { id },
        { $push: { lessons: { ...lesson } } },
        { returnDocument: 'after', upsert: true },
      );
    }

    return await this.findOne(id);
  }

  async deleteLesson(classIds: string[], lessonId: string) {
    for (const classId of classIds) {
      await this.classRepo.findOneAndUpdate(
        {
          id: classId,
          lessons: {
            $elemMatch: {
              id: lessonId,
            },
          },
        },
        {
          $pull: {
            lessons: { id: lessonId },
          },
        },
      );
    }

    return true;
  }

  async deleteMany(ids: string[], uid: string): Promise<string> {
    const classIds: string[] = [];

    for (const id of ids) {
      const isExisted = await this.findOne(id);

      if (isExisted.create_by !== uid)
        throw new BusinessException(ErrorEnum.NO_PERMISSON, id);

      if (isExisted.lessons.length > 0)
        throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);

      const isReplaced = classIds.some((classId) => classId === id);

      if (!isReplaced) classIds.push(id);
    }

    // for (const id of classIds) {
    //   const isExisted = await this.findOne(id);
    //
    //   if (isExisted.lessonIds.length > 0)
    //     for (const lessonId of isExisted.lessonIds) {
    //       const lesson = await this.lessonService.findOne(lessonId);
    //       const newLessonClassIds: string[] = lesson.classIds.filter(
    //         (classId) => classId !== id,
    //       );
    //
    //       await this.lessonService.update(lessonId, {
    //         classIds: newLessonClassIds,
    //       });
    //     }
    // }

    await this.classRepo.deleteMany({ id: { $in: classIds } });

    return '200:Xóa thành công!';
  }
}
