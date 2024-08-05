import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';

@ObjectType('ChapterPagination')
export class ChapterPagination {
  @Field(() => [ChapterEntity])
  @IsArray()
  readonly data: ChapterEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: ChapterEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
