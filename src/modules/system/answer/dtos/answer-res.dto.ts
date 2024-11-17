import { Field, ObjectType } from '@nestjs/graphql';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';

@ObjectType('ExamQuestionAnswerModel')
export class ExamQuestionAnswerDto extends AnswerEntity {
  @Field(() => String, { description: 'Nhãn đáp án' })
  label: string;
}
