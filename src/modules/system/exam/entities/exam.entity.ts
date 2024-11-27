import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { ExamQuestionDto } from '~/modules/system/question/dtos/question-res.dto';
import { CategoryEnum } from '~/modules/system/question/enum/category.enum';

@ObjectType()
export class ScaleDto {
  @Field(() => Number)
  percent: number;
  @Field(() => Float, { nullable: true })
  score: number;
  @Field(() => String)
  chapterId: string;
  @Field(() => LevelEnum)
  level: LevelEnum;
  @Field(() => CategoryEnum)
  category: CategoryEnum;
}

@ObjectType('ExamModel')
@Entity('exam_entity')
export class ExamEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  label: string;

  @Field(() => String)
  @Column({ type: 'string' })
  time: string;

  @Field(() => String)
  @Column({ type: 'string' })
  sku: string;

  @Field(() => Float)
  @Column('double')
  maxScore: number = 10.0;

  // IScale: Chapter, Level, Percent, Catalog
  @Field(() => [ScaleDto])
  @Column('json', { array: true })
  scales: IScale[];

  @Field(() => [ExamQuestionDto])
  @Column('json', { array: true })
  questions: ExamQuestionDto[];

  @Field(() => StatusShareEnum)
  @Column('enum', { enum: StatusShareEnum })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  constructor(examEntity: Partial<ExamEntity>) {
    super();
    Object.assign(this, examEntity);
  }
}
