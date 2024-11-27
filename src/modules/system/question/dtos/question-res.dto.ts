import { Field, ObjectType } from '@nestjs/graphql';
import { ExamQuestionAnswerDto } from '~/modules/system/question/dtos/answer-res.dto';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('ExamQuestionModel')
export class ExamQuestionDto extends QuestionEntity {
  @Field(() => String)
  label: string;

  @Field(() => [ExamQuestionAnswerDto])
  answers: ExamQuestionAnswerDto[];
}

@ObjectType('QuestionPagination')
export class QuestionPagination extends createPaginatedType(QuestionEntity) {}
