import { BaseDto } from '~/common/dtos/base.dto';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { Field, HideField, InputType } from '@nestjs/graphql';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { Expose } from 'class-transformer';
import { IsScale } from '~/common/decorators/scale.decorator';
import { Max, Min, Validate } from 'class-validator';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { IsValidString } from '~/common/decorators/string.decorator';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import {
  AnswerLabelEnum,
  QuestionLabelEnum,
} from '~/modules/system/exam/enums/label.enum';

@InputType('ExamPageOptions')
export class ExamPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], {
    nullable: true,
  })
  readonly examStatus?: StatusShareEnum[];
}

@InputType()
export class QuestionInfoDto {
  @Field(() => String)
  chapterId: string;

  @Field(() => [String])
  questionIds: string[];
}

@InputType()
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
  @Field(() => String)
  @Validate(IsValidString)
  label: string;

  @Field(() => QuestionLabelEnum)
  questionLabel: QuestionLabelEnum;

  @Field(() => AnswerLabelEnum)
  answerLabel: AnswerLabelEnum;

  @Field(() => String)
  @Validate(IsValidString)
  lessonId: string;

  @Field(() => String, { nullable: true })
  sku: string = '';

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

@InputType()
export class CreateExamDto extends BaseExamDto {
  @HideField()
  scales: Scale[];

  @Field(() => [QuestionInfoDto])
  questionInfo: QuestionInfoDto[];

  @HideField()
  createBy: string;
}

@InputType('GenerateExamArgs')
export class GenerateExamDto extends BaseExamDto {
  @Field(() => [Scale])
  @IsScale()
  @Expose()
  scales: Scale[];

  @Field(() => Number)
  totalQuestions: number;

  @HideField()
  createBy: string;
}
