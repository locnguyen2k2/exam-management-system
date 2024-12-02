import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { LessonEntity } from '~/modules/system/lesson/entities/lesson.entity';

@ObjectType('ClassModel')
@Entity('class_entity')
export class ClassEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  name: string;

  @Field(() => String)
  @Column({ type: 'string' })
  code: string;

  @Field(() => String)
  @Column({ type: 'string' })
  description: string = '';

  @Field(() => String)
  @Column({ type: 'string' })
  startYear: string;

  @Field(() => String)
  @Column({ type: 'string' })
  endYear: string;

  @Field(() => StatusShareEnum)
  @Column({
    type: 'enum',
    enum: StatusShareEnum,
  })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [LessonEntity])
  @Column({ type: 'json', array: true })
  lessons: LessonEntity[] = [];

  @Field(() => [String])
  @Column('string', { array: true })
  shared: string[] = [];

  constructor(classEntity: Partial<ClassEntity>) {
    super();
    Object.assign(this, classEntity);
  }
}
