import { Column, Entity } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';

@ObjectType('LessonDefaultFields')
@Entity('lesson_entity')
export class LessonEntity extends ExtendedEntity {
  @Field(() => String)
  @Column('string')
  label: string = '';

  @Field(() => String)
  @Column('string')
  name: string;

  @Field(() => Int)
  @Column('int')
  credit: number;

  @Field(() => String)
  @Column('string')
  description: string = '';

  @Field(() => StatusShareEnum)
  @Column('enum', { enum: StatusShareEnum })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [String])
  @Column('string', { array: true })
  chapterIds: string[] = [];

  @Field(() => [ExamEntity])
  @Column('json', { array: true })
  exams: ExamEntity[] = [];

  constructor(lessonEntity: Partial<LessonEntity>) {
    super();
    Object.assign(this, lessonEntity);
  }
}
