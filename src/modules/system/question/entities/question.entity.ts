import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { CategoryEnum } from '~/modules/system/category/category.enum';

@ObjectType()
@Entity('question_entity')
export class QuestionEntity extends ExtendedEntity {
  // @HideField()
  // @Column({ type: 'string' })
  // label: string = '';

  @Field(() => String)
  @Column({ type: 'string' })
  content: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string' })
  remark: string = '';

  @Field(() => String)
  @Column('string')
  chapterId: string;

  @Field(() => LevelEnum)
  @Column({ type: 'enum', enum: LevelEnum })
  level: LevelEnum;

  @Field(() => Boolean, { nullable: true })
  @Column({ type: 'boolean' })
  enable: boolean = false;

  @Field(() => StatusShareEnum, {
    nullable: true,
    defaultValue: StatusShareEnum.PRIVATE,
  })
  @Column({
    type: 'enum',
    enum: StatusShareEnum,
    default: StatusShareEnum.PRIVATE,
  })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => CategoryEnum)
  @Column('enum', { enum: CategoryEnum })
  category: CategoryEnum;

  @Field(() => [String])
  @Column('string', { array: true })
  correctAnswerIds: string[];

  @Field(() => [String])
  @Column('string', { array: true })
  answerIds: string[] = [];

  constructor(questionEntity: Partial<QuestionEntity>) {
    super();
    Object.assign(this, questionEntity);
  }
}
