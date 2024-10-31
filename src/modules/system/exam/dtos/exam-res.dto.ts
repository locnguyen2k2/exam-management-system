import { Field, Float, ObjectType } from '@nestjs/graphql';
import {
  ExamEntity,
  ScaleDto,
} from '~/modules/system/exam/entities/exam.entity';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';

// @ObjectType('ExamModel')
// export class ExamDetailDto extends ExtendedEntity {
//   @Field(() => String, { nullable: true })
//   label: string;
//
//   @Field(() => String)
//   time: string;
//
//   @Field(() => String)
//   sku: string;
//
//   @Field(() => Float, { description: '10.0 được đặt mặc định', nullable: true })
//   maxScore: number = 10.0;
//
//   @Field(() => [ScaleDto])
//   scales: IScale[];
//
//   @Field(() => [QuestionEntity])
//   questions: QuestionEntity[];
//
//   @Field(() => StatusShareEnum, { nullable: true })
//   status: StatusShareEnum = StatusShareEnum.PRIVATE;
// }

@ObjectType('ExamPagination')
export class ExamPaginationDto extends createPaginatedType(ExamEntity) {}
