import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { ExamQuestionDto } from '~/modules/system/question/dtos/question-res.dto';
import { CategoryEnum } from '~/modules/system/category/category.enum';

@ObjectType()
export class ScaleDto {
  @Field(() => Number, { nullable: true })
  percent: number;
  @Field(() => String, { nullable: true })
  chapterId: string;
  @Field(() => LevelEnum)
  level: LevelEnum;
  @Field(() => CategoryEnum)
  category: CategoryEnum;
}

@ObjectType('ExamModel')
@Entity('exam_entity')
export class ExamEntity extends ExtendedEntity {
  @Field(() => String, { nullable: true })
  @Column({ type: 'string', default: null })
  label: string;

  @Field(() => String)
  @Column({ type: 'string' })
  time: string;

  @Field(() => String)
  @Column({ type: 'string' })
  sku: string;

  @Field(() => Float, { description: '10 được đặt mặc định', nullable: true })
  @Column('int', { default: 10.0 })
  maxScore: number = 10.0;

  // IScale: Chapter, Level, Percent, Catalog
  @Field(() => [ScaleDto])
  @Column('json', { array: true })
  scales: IScale[];

  @Field(() => [ExamQuestionDto])
  @Column('json', { array: true })
  questions: ExamQuestionDto[];

  @Field(() => Boolean, { nullable: true })
  @Column('boolean', { default: false })
  enable: boolean;

  @Field(() => StatusShareEnum, { nullable: true })
  @Column('enum', { enum: StatusShareEnum, default: StatusShareEnum.PRIVATE })
  status: StatusShareEnum;

  constructor(examEntity: Partial<ExamEntity>) {
    super();
    Object.assign(this, examEntity);
  }
}
