import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ClassSimpleDto } from '~/modules/system/class/dtos/class-res.dto';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('LessonModel')
export class LessonDetailDto extends ExtendedEntity {
  @Field(() => String, { nullable: true })
  label: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [ChapterEntity], { nullable: true })
  chapters?: ChapterEntity[] = [];

  @Field(() => [ClassSimpleDto], { nullable: true })
  classes?: ClassSimpleDto[] = [];

  @Field(() => [ExamEntity], { nullable: true })
  exams?: ExamEntity[] = [];
}

@ObjectType('lessons')
export class LessonPaginationDto extends createPaginatedType(LessonDetailDto) {}
