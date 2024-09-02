import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';

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

  @Field(() => [String], { nullable: true })
  @Column({ type: 'string', array: true, default: [] })
  lessonIds: string[] = [];

  constructor(classEntity: Partial<ClassEntity>) {
    super();
    Object.assign(this, classEntity);
  }
}
