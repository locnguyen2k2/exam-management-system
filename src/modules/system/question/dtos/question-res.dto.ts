import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import {
  CorrectAnswerDto,
  QuestionAnswerDto,
  QuestionCorrectAnswerDto,
} from '~/modules/system/answer/dtos/answer-res.dto';

@ObjectType('QuestionSimpleFields')
export class ExamQuestionDto {
  @Field(() => String)
  questionId: string;
  @Field(() => String)
  label: string;
  @Field(() => [QuestionCorrectAnswerDto])
  correctAnswers: QuestionCorrectAnswerDto[];
  @Field(() => [QuestionAnswerDto])
  answers: QuestionAnswerDto[];
}

@ObjectType('QuestionModel')
export class QuestionDetailDto extends ExtendedEntity {
  @Field(() => String, { nullable: true })
  label: string;

  @Field(() => String)
  content: string;

  @Field(() => String, { nullable: true })
  picture: string;

  @Field(() => String, { nullable: true })
  remark: string;

  @Field(() => String)
  chapterId: string;

  @Field(() => LevelEnum)
  level: LevelEnum;

  @Field(() => StatusShareEnum, {
    nullable: true,
  })
  status: StatusShareEnum;

  @Field(() => CategoryEnum)
  category: CategoryEnum;

  @Field(() => [CorrectAnswerDto])
  correctAnswers: CorrectAnswerDto[];

  @Field(() => [AnswerEntity])
  answers: AnswerEntity[];

  @Field(() => String, { nullable: true })
  sku: string;
}

@ObjectType('QuestionPagination')
export class QuestionPagination {
  @Field(() => [QuestionDetailDto])
  @IsArray()
  readonly data: QuestionDetailDto[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: QuestionDetailDto[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
