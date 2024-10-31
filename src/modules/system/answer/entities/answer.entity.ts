import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType('AnswerModel')
@Entity('answer_entity')
export class AnswerEntity extends ExtendedEntity {
  @Field(() => String, {
    description:
      'Đáp án câu hỏi điền khuyết sẽ phân cách bằng ký hiệu [__] (đóng ngoặc vuông, 2 gạch dưới, đóng ngoặc vuông)',
  })
  @Column({ type: 'string' })
  value: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', default: null })
  score: number;

  @Field(() => Boolean, { nullable: true })
  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Field(() => String, {
    nullable: true,
    defaultValue: null,
    description: 'Chú thích của đáp án',
  })
  @Column({ type: 'string', default: null })
  remark: string;

  constructor(answerEntity: Partial<AnswerEntity>) {
    super();
    Object.assign(this, answerEntity);
  }
}
