import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { MongoRepository } from 'typeorm';
import {
  CreateLessonDto,
  LessonPageOptions,
} from '~/modules/system/lesson/dtos/lesson-req.dto';
import { LessonPaginationDto } from '~/modules/system/lesson/dtos/lesson-res.dto';
import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { ExamService } from '~/modules/system/exam/exam.service';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { pipeLine } from '~/utils/pipe-line';
import { ClassService } from '~/modules/system/class/class.service';

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
      ...(!_.isEmpty(pageOptions.lessonStatus) && {
        status: { $in: pageOptions.lessonStatus },
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
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.lessonRepo
      .aggregate(pipes)
      .toArray();

    const entities = data;
    const lessonModels = new Array(entities.length);

    for (let i = 0; i < entities.length; i++) {
      const chapterIds = entities[i].chapterIds;
      const examsIds = entities[i].examIds;

      delete entities[i].chapterIds;
      delete entities[i].examIds;

      entities[i]['chapters'] = await Promise.all(
        chapterIds.map(
          async (chapterId: string) =>
            await this.chapterService.detailChapter(chapterId),
        ),
      );

      entities[i]['exams'] = await Promise.all(
        examsIds.map(
          async (examId: string) =>
            await this.examService.getExamDetail(examId),
        ),
      );

      lessonModels[i] = entities[i];
    }

    const numberRecords = lessonModels.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });

    return new LessonPaginationDto(lessonModels, pageMetaDto);
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

  async getAvailable(id: string, uid: string): Promise<LessonEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted.create_by === uid) return isExisted;

    if (
      isExisted.status === StatusShareEnum.PUBLIC &&
      isExisted.enable === true
    )
      return isExisted;

    throw new BusinessException(
      `400:Bản ghi "${isExisted.name}" không có sẵn!`,
    );
  }

  async detailLesson(id: string): Promise<any> {
    const isExisted = await this.findOne(id);
    const chapterIds = isExisted.chapterIds;
    const examsIds = isExisted.examIds;

    delete isExisted.chapterIds;
    delete isExisted.examIds;

    isExisted['chapters'] = await Promise.all(
      chapterIds.map(
        async (chapterId: string) =>
          await this.chapterService.detailChapter(chapterId),
      ),
    );

    isExisted['exams'] = await Promise.all(
      examsIds.map(
        async (examId: string) => await this.examService.getExamDetail(examId),
      ),
    );

    return isExisted;
  }

  async findOne(id: string): Promise<LessonEntity> {
    const isExisted = await this.lessonRepo.findOne({ where: { id } });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async create(data: CreateLessonDto): Promise<LessonEntity[]> {
    const listLessons = [];
    await Promise.all(
      data.items.map(async (lesson) => {
        const isExisted = await this.findByName(lesson.name);

        if (isExisted && isExisted.create_by === data.createBy)
          throw new BusinessException(
            `400:Tên học phần ${lesson.name} đã tồn tại!`,
          );

        listLessons.push(
          new LessonEntity({
            ...lesson,
            create_by: data.createBy,
            update_by: data.createBy,
          }),
        );
      }),
    );
    const newLessons = this.lessonRepo.create(listLessons);

    return await this.lessonRepo.save(newLessons);
  }

  async update(id: string, data: any): Promise<LessonEntity> {
    const isExisted = await this.findOne(id);
    const newClassIds: string[] = [];

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException('400:Không thể cập nhật học phần này!');
    }

    if (!_.isNil(data.name)) {
      const isReplaced = await this.findByName(data.name);

      if (isReplaced && isReplaced.id !== id) {
        throw new BusinessException('400:Tên học phần đã tồn tại!');
      }

      await this.examService.updateExamsLessonName(id, data.name);
    }

    if (!_.isNil(data.classIds) && data.classIds.length > 0) {
      for (const classId of data.classIds) {
        await this.classService.findOne(classId);
        const isReplaced = newClassIds.some(
          (newClassId) => newClassId === classId,
        );

        !isReplaced && newClassIds.push(classId);
      }
    }

    // Cập nhật danh sách lớp của học phần
    if (newClassIds.length > 0) {
      const oldClassIds: string[] = [];

      for (const oldClassId of isExisted.classIds) {
        !newClassIds.includes(oldClassId) && oldClassIds.push(oldClassId);
      }

      if (oldClassIds.length > 0) {
        for (const oldClassId of oldClassIds) {
          const isClass = await this.classService.findOne(oldClassId);
          const newLessonIds = isClass.lessonIds.filter(
            (oldLessonId) => oldLessonId !== id,
          );

          await this.classService.updateClassLessons(isClass.id, newLessonIds);
        }
      }

      for (const newClassId of newClassIds) {
        const isClass = await this.classService.findOne(newClassId);

        if (!isClass.lessonIds.includes(id)) {
          const lessonsInClass = [...isClass.lessonIds, id];
          await this.classService.updateClassLessons(
            isClass.id,
            lessonsInClass,
          );
        }
      }
    }

    const { affected } = await this.lessonRepo.update(
      { id },
      {
        ...(!_.isNil(data.name) && { name: data.name }),
        ...(!_.isNil(data.label) && { label: data.label }),
        ...(!_.isNil(data.description) && { description: data.description }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        ...(!_.isNil(data.status) && { status: data.status }),
        ...(!_.isNil(data.chapterIds) && { chapterIds: data.chapterIds }),
        ...(!_.isEmpty(newClassIds) && { classIds: newClassIds }),
        ...(!_.isNil(data.examIds) && { examIds: data.examIds }),
        update_by: data.updateBy,
      },
    );

    return affected === 0 ? isExisted : await this.findOne(id);
  }

  async updateLessonClasses(
    id: string,
    classIds: string[],
  ): Promise<LessonEntity> {
    const isExisted = await this.findOne(id);

    const { affected } = await this.lessonRepo.update(
      { id },
      {
        ...{ classIds: classIds },
      },
    );

    return affected === 0 ? isExisted : await this.findOne(id);
  }
}