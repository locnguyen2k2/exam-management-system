import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { CategoryEnum } from '~/modules/system/question/enum/category.enum';
import { AnswerEntity } from '~/modules/system/question/entities/answer.entity';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ObjectType('QuestionModel')
@Entity('question_entity')
export class QuestionEntity extends ExtendedEntity {
  @Field(() => String, { description: 'Nội dung câu hỏi' })
  @Column({ type: 'string' })
  content: string;

  @Field(() => String, { description: 'Hình ảnh', nullable: true })
  @Column({ type: 'string' })
  picture: string = null;

  @Field(() => String, { description: 'Chú thích' })
  @Column({ type: 'string' })
  remark: string = '';

  @Field(() => LevelEnum, { description: 'Cấp độ câu hỏi' })
  @Column({ type: 'enum', enum: LevelEnum })
  level: LevelEnum;

  @Field(() => StatusShareEnum)
  @Column({ type: 'enum', enum: StatusShareEnum })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => CategoryEnum, { description: 'Loại câu hỏi' })
  @Column('enum', { enum: CategoryEnum })
  category: CategoryEnum;

  @Field(() => [AnswerEntity], {
    description: 'Danh sách đáp án',
  })
  @ValidateNested({ each: true })
  @Type(() => AnswerEntity)
  @Column('json', { array: true })
  answers: AnswerEntity[] = [];

  constructor(questionEntity: Partial<QuestionEntity>) {
    super();
    Object.assign(this, questionEntity);
  }
}
