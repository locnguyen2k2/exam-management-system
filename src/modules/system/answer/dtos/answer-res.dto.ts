import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';

@ObjectType('CorrectAnswerModel')
export class CorrectAnswerDto extends AnswerEntity {
  @Field(() => Float, { nullable: true })
  score: number;
}

@ObjectType('CorrectAnswerSimpleFields')
export class QuestionCorrectAnswerDto {
  @Field(() => String)
  correctAnswerId: string;

  @Field(() => Float, { nullable: true })
  score: number;
}

@ObjectType('AnswerSimpleFields')
export class QuestionAnswerDto {
  @Field(() => String)
  label: string;
  @Field(() => String)
  answerId: string;
}

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
