import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';

@ObjectType('CorrectAnswerModel')
export class CorrectAnswerDto extends AnswerEntity {
  @Field(() => Float, { nullable: true, description: 'Điểm của đáp án đúng' })
  score: number;
}

@ObjectType('CorrectAnswerSimpleFields')
export class QuestionCorrectAnswerDto {
  @Field(() => String, { description: 'Mã của đáp án đúng' })
  correctAnswerId: string;

  @Field(() => Float, { nullable: true, description: 'Điểm của đáp án đúng' })
  score: number;
}

@ObjectType('AnswerSimpleFields')
export class QuestionAnswerDto {
  @Field(() => String, { description: 'Nhãn của đáp án' })
  label: string;
  @Field(() => String, { description: 'Mã của đáp án' })
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
