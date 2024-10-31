import { Field, Float, ObjectType } from '@nestjs/graphql';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

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

@ObjectType('ExamQuestionAnswerModel')
export class ExamQuestionAnswerDto extends AnswerEntity {
  @Field(() => String, { description: 'Nhãn đáp án' })
  label: string;
}

@ObjectType('answers')
export class AnswerPagination extends createPaginatedType(AnswerEntity) {}
