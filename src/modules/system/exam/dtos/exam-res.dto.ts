import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import {
  ExamEntity,
  LessonDto,
  ScaleDto,
} from '~/modules/system/exam/entities/exam.entity';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { QuestionDetailDto } from '~/modules/system/question/dtos/question-res.dto';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType('ExamModel')
export class ExamDetailDto extends ExtendedEntity {
  @Field(() => String)
  label: string;

  @Field(() => LessonDto)
  lesson: LessonDto;

  @Field(() => String)
  time: string;

  @Field(() => String)
  sku: string;

  @Field(() => Float, { description: '10.0 được đặt mặc định', nullable: true })
  maxScore: number = 10.0;

  @Field(() => [ScaleDto])
  scales: IScale[];

  @Field(() => [QuestionDetailDto])
  questions: QuestionDetailDto[];

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;
}

@ObjectType('ExamPagination')
export class ExamPaginationDto {
  @Field(() => [ExamEntity])
  @IsArray()
  readonly data: ExamEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: ExamEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
