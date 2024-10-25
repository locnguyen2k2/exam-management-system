import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { CategoryEnum } from '~/modules/system/category/category.enum';
import { QuestionCorrectAnswerDto } from '~/modules/system/answer/dtos/answer-res.dto';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';

@ObjectType('QuestionDefaultFields')
@Entity('question_entity')
export class QuestionEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  content: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', nullable: true })
  picture: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string' })
  remark: string = '';

  @Field(() => ChapterEntity)
  @Column('json')
  chapter: ChapterEntity;

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

  @Field(() => [QuestionCorrectAnswerDto])
  @Column('json', { array: true })
  correctAnswerIds: QuestionCorrectAnswerDto[];

  @Field(() => [String])
  @Column('string', { array: true })
  answerIds: string[] = [];

  constructor(questionEntity: Partial<QuestionEntity>) {
    super();
    Object.assign(this, questionEntity);
  }
}
