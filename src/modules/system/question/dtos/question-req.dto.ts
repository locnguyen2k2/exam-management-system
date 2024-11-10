import {
  Field,
  Float,
  HideField,
  InputType,
  Int,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { FileUpload } from '~/modules/system/image/image.interface';
import { AnswerBaseDto } from '~/modules/system/answer/dtos/answer-req.dto';
import { Validate, ValidateNested } from 'class-validator';
import { IsValidStringId } from '~/common/decorators/id.decorator';
import { Type } from 'class-transformer';

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
class UpdateQuestionAnswerDto extends PickType(BaseDto, [
  'created_at',
  'updated_at',
  'enable',
] as const) {
  @Field(() => String)
  @Validate(IsValidStringId)
  id: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Đáp án câu hỏi điền khuyết sẽ ' +
      'phân cách bằng ký hiệu [__] ' +
      '(đóng ngoặc vuông, 2 gạch dưới, đóng ngoặc vuông)',
  })
  value: string;

  @Field(() => Boolean, { nullable: true })
  isCorrect: boolean;

  @Field(() => Float, { nullable: true })
  score: number;

  @Field(() => String, { nullable: true, description: 'Chú thích' })
  remark: string;
}

@InputType('QuestionArgs')
class QuestionBaseDto extends BaseDto {
  @Field(() => String, { nullable: true })
  sku: string;

  @Field(() => String)
  content: string;

  @Field(() => GraphQLUpload, { nullable: true })
  picture: FileUpload;

  @Field(() => String, { nullable: true })
  remark: string;

  @Field(() => String)
  @Validate(IsValidStringId)
  chapterId: string;

  @Field(() => LevelEnum)
  level: LevelEnum;

  @Field(() => StatusShareEnum, {
    nullable: true,
  })
  status: StatusShareEnum;

  @Field(() => CategoryEnum)
  category: CategoryEnum;

  @Field(() => Int, {
    nullable: true,
    description:
      'Số lượng đáp án nhiễu (cho câu hỏi điền khuyết) tự tạo đáp án nhiễu từ đáp án đúng.',
  })
  quantityWrongAnswers: number;

  @Field(() => [AnswerBaseDto!]!, {
    description:
      'Với câu hỏi điền khuyết, ' +
      'đáp án đúng là đáp án chứa các giá trị bị khuyết ' +
      'và ngăn cách bởi tổ hợp các ký hiệu: [__]. ' +
      'Chỉ cần nhập đáp án đúng nếu có nhập số lượng đáp án',
  })
  answers: AnswerBaseDto[];
}

@InputType('CreateQuestionsArgs')
export class CreateQuestionsDto {
  @Field(() => [QuestionBaseDto])
  @ValidateNested({ each: true })
  @Type(() => QuestionBaseDto)
  questions: QuestionBaseDto[];

  @HideField()
  createBy: string;
}

@InputType()
class EnableQuestionDto {
  @Field(() => String)
  @Validate(IsValidStringId)
  questionId: string;

  @Field(() => Boolean)
  enable: boolean;
}

@InputType('EnableQuestionsArgs')
export class EnableQuestionsDto {
  @Field(() => [EnableQuestionDto])
  @ValidateNested({ each: true })
  @Type(() => EnableQuestionDto)
  questionsEnable: EnableQuestionDto[];

  @HideField()
  updateBy: string;
}

@InputType('UpdateQuestionArgs')
export class UpdateQuestionDto extends PartialType(
  PickType(QuestionBaseDto, [
    'content',
    'picture',
    'remark',
    'chapterId',
    'level',
    'enable',
    'status',
    'category',
    'quantityWrongAnswers',
  ] as const),
) {
  @Field(() => [UpdateQuestionAnswerDto], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionAnswerDto)
  answers: UpdateQuestionAnswerDto[];

  @HideField()
  updateBy: string = null;
}

@InputType('UpdateQuestionStatusArgs')
export class UpdateQuestionStatusDto {
  @Field(() => [QuestionStatusDto])
  @ValidateNested({ each: true })
  @Type(() => QuestionStatusDto)
  questionsStatus: QuestionStatusDto[];

  @HideField()
  updateBy: string;
}

@InputType()
class QuestionStatusDto {
  @Field(() => String)
  @Validate(IsValidStringId)
  questionId: string;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;
}
