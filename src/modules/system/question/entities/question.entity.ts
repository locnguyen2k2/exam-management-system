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
  @Field(() => String, {description: 'Nội dung câu hỏi'})
  @Column({ type: 'string' })
  content: string;

  @Field(() => String, { nullable: true, description: 'Hình ảnh' })
  @Column({ type: 'string', nullable: true })
  picture: string;

  @Field(() => String, { nullable: true, description: 'Chú thích' })
  @Column({ type: 'string', nullable: true })
  remark: string;

  @Field(() => ChapterEntity, {description: 'Chương'})
  @Column('json')
  chapter: ChapterEntity;

  @Field(() => LevelEnum, {description: 'Cấp độ câu hỏi'})
  @Column({ type: 'enum', enum: LevelEnum })
  level: LevelEnum;

  @Field(() => Boolean, { nullable: true, description: 'Trạng thái kích hoạt' })
  @Column({ type: 'boolean' })
  enable: boolean = false;

  @Field(() => StatusShareEnum, {
    nullable: true,
    defaultValue: StatusShareEnum.PRIVATE,
    description: 'Trạng thái'
  })
  @Column({
    type: 'enum',
    enum: StatusShareEnum,
    default: StatusShareEnum.PRIVATE,
  })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  @Field(() => CategoryEnum, {description: 'Loại câu hỏi'})
  @Column('enum', { enum: CategoryEnum })
  category: CategoryEnum;

  @Field(() => [QuestionCorrectAnswerDto], {description: 'Mã đáp án đúng (1 hoặc nhiều tùy loại câu hỏi)'})
  @Column('json', { array: true })
  correctAnswerIds: QuestionCorrectAnswerDto[];

  @Field(() => [String], {description: 'Mã đáp án'})
  @Column('string', { array: true })
  answerIds: string[];

  constructor(questionEntity: Partial<QuestionEntity>) {
    super();
    Object.assign(this, questionEntity);
  }
}
