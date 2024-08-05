import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { LessonEntity } from '~/modules/system/lession/entities/lesson.entity';

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
