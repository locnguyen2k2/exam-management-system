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

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', default: '' })
  description: string = '';

  @Field(() => String, { nullable: true })
  @Column({ type: 'string' })
  startYear: string = '';

  @Field(() => String, { nullable: true })
  @Column({ type: 'string' })
  endYear: string = '';

  @Field(() => Boolean, { nullable: true })
  @Column('boolean', { default: false })
  enable: boolean;

  @Field(() => StatusShareEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: StatusShareEnum,
    default: StatusShareEnum.PRIVATE,
  })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [LessonEntity], { nullable: true })
  @Column({ type: 'json', array: true, default: [] })
  lessons: LessonEntity[] = [];

  constructor(classEntity: Partial<ClassEntity>) {
    super();
    Object.assign(this, classEntity);
  }
}
