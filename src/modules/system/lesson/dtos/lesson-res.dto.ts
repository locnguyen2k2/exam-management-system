import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ChapterDetailDto } from '~/modules/system/chapter/dtos/chapter-res.dto';
import { ExamDetailDto } from '~/modules/system/exam/dtos/exam-res.dto';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';
import { Column } from 'typeorm';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';

@ObjectType('LessonSimpleFields')
export class LessonBaseDto {
  @Field(() => String)
  @Column({ type: 'string' })
  lessonId: string;

  @Field(() => String)
  @Column({ type: 'string' })
  name: string;
}

@ObjectType('LessonModel')
export class LessonDetailDto extends ExtendedEntity {
  @Field(() => String)
  label: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string = '';

  @Field(() => StatusShareEnum)
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [ChapterEntity], { nullable: true })
  chapters?: ChapterEntity[] = [];

  @Field(() => [ClassEntity], { nullable: true })
  classes?: ClassEntity[] = [];

  @Field(() => [ExamDetailDto], { nullable: true })
  exams?: ExamDetailDto[] = [];
}

@ObjectType('lessons')
export class LessonPaginationDto {
  @Field(() => [LessonEntity])
  @IsArray()
  readonly data: LessonEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: LessonEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
