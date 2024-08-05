import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';

@ObjectType('answers')
export class AnswerPagination {
  @Field(() => [AnswerEntity])
  @IsArray()
  readonly data: AnswerEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: AnswerEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
