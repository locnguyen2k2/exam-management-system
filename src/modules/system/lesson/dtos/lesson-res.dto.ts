import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ClassSimpleDto } from '~/modules/system/class/dtos/class-res.dto';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('LessonModel')
export class LessonDetailDto extends ExtendedEntity {
  @Field(() => String)
  label: string;

  @Field(() => String)
  name: string;

  @Field(() => Number)
  credit: number;

  @Field(() => String)
  description: string;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;

  @Field(() => [ChapterEntity])
  chapters?: ChapterEntity[];

  @Field(() => [ClassSimpleDto])
  classes?: ClassSimpleDto[];

  @Field(() => [ExamEntity])
  exams?: ExamEntity[];
}

@ObjectType('lessons')
export class LessonPaginationDto extends createPaginatedType(LessonDetailDto) {}
