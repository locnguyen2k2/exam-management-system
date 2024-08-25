import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { Stream } from 'stream';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';

export interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => Stream;
}

@InputType('QuestionPageOptions')
export class QuestionPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  questionStatus: StatusShareEnum[];

  @Field(() => [LevelEnum], { nullable: true })
  questionLevel: LevelEnum[];

  @Field(() => [CategoryEnum], { nullable: true })
  questionCategory: CategoryEnum[];
}

@InputType()
class QuestionBaseDto extends BaseDto {
  @Field(() => String, { nullable: true })
  sku: string;

  @Field(() => String)
  content: string;

  @Field(() => GraphQLUpload, { nullable: true })
  picture: Promise<FileUpload>;

  @Field(() => String, { nullable: true })
  remark: string;

  @Field(() => String)
  chapterId: string;

  @Field(() => LevelEnum)
  level: LevelEnum;

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  @Field(() => StatusShareEnum, {
    nullable: true,
  })
  status: StatusShareEnum;

  @Field(() => CategoryEnum)
  category: CategoryEnum;

  @Field(() => [String])
  correctAnswerIds: string[];

  @Field(() => [String!]!)
  answerIds: string[];
}

@InputType('CreateQuestionsArgs')
export class CreateQuestionsDto {
  @Field(() => [QuestionBaseDto])
  questions: QuestionBaseDto[];

  @HideField()
  createBy: string;
}

@InputType('UpdateQuestionArgs')
export class UpdateQuestionDto extends PartialType(QuestionBaseDto) {
  @HideField()
  updateBy: string = null;
}

@InputType('UpdateQuestionStatusArgs')
export class UpdateQuestionStatusDto {
  @Field(() => [QuestionStatusDto])
  questionsStatus: QuestionStatusDto[];
  @HideField()
  updateBy: string;
}

@InputType()
class QuestionStatusDto {
  @Field(() => String)
  questionId: string;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;
}
