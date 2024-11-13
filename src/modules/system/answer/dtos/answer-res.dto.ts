import { Field, ObjectType } from '@nestjs/graphql';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('ExamQuestionAnswerModel')
export class ExamQuestionAnswerDto extends AnswerEntity {
  @Field(() => String, { description: 'Nhãn đáp án' })
  label: string;
}

@ObjectType('answers')
export class AnswerPagination extends createPaginatedType(AnswerEntity) {}
