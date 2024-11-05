import { BaseDto } from '~/common/dtos/base.dto';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { Field, HideField, InputType } from '@nestjs/graphql';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { Expose, Transform } from 'class-transformer';
import { IsScale } from '~/common/decorators/scale.decorator';
import { IsOptional, Max, Min, Validate } from 'class-validator';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { IsValidString } from '~/common/decorators/string.decorator';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import {
  AnswerLabelEnum,
  QuestionLabelEnum,
} from '~/modules/system/exam/enums/label.enum';
import { IsValidSku } from '~/common/decorators/sku.decorator';

@InputType('ExamPaperPageOptions')
export class ExamPaperPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], {
    nullable: true,
  })
  readonly examStatus?: StatusShareEnum[];
}

@InputType('QuestionInfoArgs')
export class QuestionInfoDto {
  @Field(() => String)
  chapterId: string;

  @Field(() => [String])
  questionIds: string[];
}

@InputType('ScaleArgs')
class Scale implements IScale {
  @Field(() => String)
  chapterId: string;

  @Field(() => Number)
  @Min(10)
  @Max(100)
  percent: number;

  @Field(() => LevelEnum)
  level: LevelEnum;
}

@InputType()
class BaseExamDto extends BaseDto {
  @Field(() => String, { nullable: true })
  @Validate(IsValidString)
  label: string;

  @Field(() => Number, { description: 'Thời gian làm bài (phút)' })
  @Transform(({ value }) =>
    typeof value === 'number' ? `${value} phút` : value,
  )
  time: string;

  @Field(() => QuestionLabelEnum)
  questionLabel: QuestionLabelEnum;

  @Field(() => AnswerLabelEnum)
  answerLabel: AnswerLabelEnum;

  @Field(() => String)
  @Validate(IsValidString)
  lessonId: string;

  @Field(() => String, { nullable: true })
  @Validate(IsValidSku)
  sku: string;

  @Field(() => Number, {
    description: '10 được đặt mặc định',
    nullable: true,
  })
  maxScore: number = 10;

  @Field(() => Boolean, { nullable: true })
  enable: boolean = false;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => Number, {
    nullable: true,
    description: 'Số lượng đề muốn random từ đề gốc đã nhập',
  })
  numberExams: number = 1;
}

@InputType('CreateExamPaperArgs')
export class CreateExamPaperDto extends BaseExamDto {
  @HideField()
  scales: Scale[];

  @Field(() => [String])
  questionIds: string[];

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Trộn ngẫu nhiên danh sách câu hỏi',
  })
  mixQuestions: boolean;

  @HideField()
  createBy: string;
}

@InputType('GenerateExamPaperArgs')
export class GenerateExamPaperDto extends BaseExamDto {
  @Field(() => [Scale])
  @IsScale()
  @Expose()
  scales: Scale[];

  @Field(() => Number)
  totalQuestions: number;

  @HideField()
  createBy: string;
}

@InputType('UpdateExamPaperArgs')
export class UpdateExamPaperDto extends BaseDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @Validate(IsValidString)
  label: string;

  @Field(() => Number, {
    nullable: true,
    description: 'Thời gian làm bài (phút)',
  })
  @Transform(({ value }) =>
    typeof value === 'number' ? `${value} phút` : value,
  )
  time: string;

  @Field(() => QuestionLabelEnum, { nullable: true })
  questionLabel: QuestionLabelEnum;

  @Field(() => AnswerLabelEnum, { nullable: true })
  answerLabel: AnswerLabelEnum;

  @Field(() => Number, {
    description: '10 được đặt mặc định',
    nullable: true,
  })
  maxScore: number = 10;

  @Field(() => Boolean, { nullable: true })
  enable: boolean = false;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @HideField()
  updateBy: string;
}

@InputType('EnableExamArgs')
class EnableExamDto {
  @Field(() => String)
  examId: string;

  @Field(() => Boolean)
  enable: boolean;
}

@InputType('EnableExamsArgs')
export class EnableExamsDto {
  @Field(() => [EnableExamDto])
  examsEnable: EnableExamDto[];
  @HideField()
  updateBy: string;
}
