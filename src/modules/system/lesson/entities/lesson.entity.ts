import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';

@ObjectType('LessonDefaultFields')
@Entity('lesson_entity')
export class LessonEntity extends ExtendedEntity {
  @Field(() => String)
  @Column('string')
  label: string;

  @Field(() => String)
  @Column('string')
  name: string;

  @Field(() => String)
  @Column('string')
  description: string = '';

  @Field(() => StatusShareEnum)
  @Column('enum', { enum: StatusShareEnum })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => [String])
  @Column('string', { array: true })
  chapterIds: string[] = [];

  @Field(() => [String])
  @Column('string', { array: true })
  classIds: string[] = [];

  @Field(() => [String])
  @Column('string', { array: true })
  examIds: string[] = [];

  constructor(lessonEntity: Partial<LessonEntity>) {
    super();
    Object.assign(this, lessonEntity);
  }
}
