import { BaseDto } from '~/common/dtos/base.dto';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { Field, Float, HideField, InputType } from '@nestjs/graphql';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { Transform, Type } from 'class-transformer';
import { IsValidScale } from '~/common/decorators/scale.decorator';
import {
  IsOptional,
  Max,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import {
  AnswerLabelEnum,
  QuestionLabelEnum,
} from '~/modules/system/exam/enums/label.enum';
import { IsValidSku } from '~/common/decorators/sku.decorator';
import { IsValidStringId } from '~/common/decorators/id.decorator';
import { CategoryEnum } from '~/modules/system/category/category.enum';

@InputType('ExamPaperPageOptions')
export class ExamPaperPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], {
    nullable: true,
  })
  readonly examStatus: StatusShareEnum[];

  @Field(() => String, {
    nullable: true,
  })
  readonly examSku: string;
}

@InputType('ScaleArgs')
class Scale implements IScale {
  @Field(() => String)
  @Validate(IsValidStringId)
  chapterId: string;

  @Field(() => Number)
  @Min(10)
  @Max(100)
  percent: number;

  @Field(() => Float, { nullable: true })
  @Min(0.1)
  @IsOptional()
  score: number = 0.25;

  @Field(() => LevelEnum)
  level: LevelEnum;

  @Field(() => CategoryEnum)
  category: CategoryEnum;
}

@InputType()
class BaseExamDto extends BaseDto {
  @Field(() => String)
  label: string;

  @Field(() => Number, { description: 'Thời gian làm bài (phút)' })
  @Transform(({ value }) => `${value} phút`)
  time: string;

  @Field(() => QuestionLabelEnum)
  questionLabel: QuestionLabelEnum;

  @Field(() => AnswerLabelEnum)
  answerLabel: AnswerLabelEnum;

  @Field(() => String)
  @Validate(IsValidStringId)
  lessonId: string;

  @Field(() => String, {
    description:
      'Mã bộ đề (ABC -> Các mã đề sinh ra:  [ABC123 | ABC321 | ABC232])',
    nullable: true,
  })
  @Validate(IsValidSku)
  sku: string;

  @Field(() => Number, { description: 'Mặc định (10)', nullable: true })
  maxScore: number = 10.0;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum;

  @Field(() => Number, {
    description: 'Số lượng đề sinh từ đề gốc',
    nullable: true,
  })
  numberExams: number = 1;
}

@InputType('CreateExamPaperArgs')
export class CreateExamPaperDto extends BaseExamDto {
  @HideField()
  scales: Scale[];

  @Field(() => [String])
  @Validate(IsValidStringId)
  questionIds: string[];

  @Field(() => Boolean, { description: 'Trộn câu hỏi', nullable: true })
  mixQuestions: boolean;

  @HideField()
  createBy: string;
}

@InputType('GenerateExamPaperArgs')
export class GenerateExamPaperDto extends BaseExamDto {
  @Field(() => [Scale])
  @Validate(IsValidScale)
  @ValidateNested({ each: true })
  @Type(() => Scale)
  scales: Scale[];

  @Field(() => Number)
  totalQuestions: number;

  @HideField()
  createBy: string;
}

@InputType('UpdateExamPaperArgs')
export class UpdateExamPaperDto extends BaseDto {
  @Field(() => String, { nullable: true })
  label: string;

  @Field(() => Number, { description: 'Thời gian (phút)', nullable: true })
  @Transform(({ value }) => `${value} phút`)
  time: string;

  @Field(() => QuestionLabelEnum, { nullable: true })
  questionLabel: QuestionLabelEnum;

  @Field(() => AnswerLabelEnum, { nullable: true })
  answerLabel: AnswerLabelEnum;

  @Field(() => Number, { description: 'Mặc định 10', nullable: true })
  maxScore: number;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum;

  @HideField()
  updateBy: string;
}

@InputType('EnableExamArgs')
class EnableExamDto {
  @Field(() => String)
  @Validate(IsValidStringId)
  examId: string;

  @Field(() => Boolean)
  enable: boolean;
}

@InputType('EnableExamsArgs')
export class EnableExamsDto {
  @Field(() => [EnableExamDto])
  @ValidateNested({ each: true })
  @Type(() => EnableExamDto)
  examsEnable: EnableExamDto[];

  @HideField()
  updateBy: string;
}
