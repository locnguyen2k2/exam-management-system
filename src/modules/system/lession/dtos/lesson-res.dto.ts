import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ChapterDetailDto } from '~/modules/system/chapter/dtos/chapter-res.dto';
import { ExamDetailDto } from '~/modules/system/exam/dtos/exam-res.dto';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';

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

  @Field(() => [ChapterDetailDto], { nullable: true })
  chapters?: ChapterDetailDto[] = [];

  @Field(() => [ClassEntity], { nullable: true })
  classes?: ClassEntity[] = [];

  @Field(() => [ExamDetailDto], { nullable: true })
  exams?: ExamDetailDto[] = [];
}

@ObjectType('lessons')
export class LessonPaginationDto {
  @Field(() => [LessonDetailDto])
  @IsArray()
  readonly data: LessonDetailDto[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: LessonDetailDto[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
