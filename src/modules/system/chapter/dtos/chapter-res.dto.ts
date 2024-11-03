import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';

@ObjectType('ChapterModel')
export class ChapterDetailDto extends ExtendedEntity {
  @Field(() => String, {})
  label: string;

  @Field(() => String, {})
  name: string;

  @Field(() => String, { nullable: true })
  description: string;

  @Field(() => LessonEntity, { nullable: true })
  lesson: LessonEntity;

  @Field(() => StatusShareEnum, {
    nullable: true,
    defaultValue: StatusShareEnum.PRIVATE,
    description: 'Trạng thái chia sẻ',
  })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [QuestionEntity], { nullable: true })
  questions: QuestionEntity[];
}

@ObjectType('ChapterPagination')
export class ChapterPagination {
  @Field(() => [ChapterDetailDto])
  @IsArray()
  readonly data: ChapterDetailDto[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: ChapterDetailDto[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
