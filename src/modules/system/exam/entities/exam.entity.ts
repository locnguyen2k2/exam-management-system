import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';

@ObjectType()
class AnswerDto {
  @Field(() => String)
  label: string;
  @Field(() => String)
  answerId: string;
}

@ObjectType()
class QuestionDto {
  @Field(() => String)
  questionId: string;
  @Field(() => String)
  label: string;
  @Field(() => [AnswerDto])
  answerIds: AnswerDto[];
}

@ObjectType()
export class LessonDto {
  @Field(() => String)
  @Column({ type: 'string' })
  lessonId: string;

  @Field(() => String)
  @Column({ type: 'string' })
  name: string;
}

@ObjectType()
export class ScaleDto {
  @Field(() => Number, { nullable: true })
  percent: number;
  @Field(() => String, { nullable: true })
  chapterId: string;
  @Field(() => LevelEnum)
  level: LevelEnum;
}

@ObjectType()
@Entity('exam_entity')
export class ExamEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  label: string;

  @Field(() => LessonDto)
  @Column({ type: 'json' })
  lesson: LessonDto;

  @Field(() => String)
  @Column({ type: 'string' })
  time: string;

  @Field(() => String)
  @Column({ type: 'string' })
  sku: string;

  @Field(() => Float, { description: '10 được đặt mặc định', nullable: true })
  @Column('int', { default: 10.0 })
  maxScore: number = 10;

  // IScale: Chapter, Level, Percent
  @Field(() => [ScaleDto])
  @Column('json', { array: true })
  scales: IScale[];

  @Field(() => [QuestionDto])
  @Column('json', { array: true })
  questions: QuestionDto[] = [];

  @Field(() => Boolean, { nullable: true })
  @Column('boolean')
  enable: boolean = false;

  @Field(() => StatusShareEnum, { nullable: true })
  @Column('enum', { enum: StatusShareEnum })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  constructor(examEntity: Partial<ExamEntity>) {
    super();
    Object.assign(this, examEntity);
  }
}
