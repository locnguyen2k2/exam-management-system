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

  @Field(() => Float)
  @Column({ type: 'float' })
  score: number = 0;

  @Field(() => Boolean)
  @Column({ type: 'boolean' })
  isCorrect: boolean = false;

  @Field(() => String, { description: 'Chú thích của đáp án' })
  @Column({ type: 'string' })
  remark: string = '';

  constructor(answerEntity: Partial<AnswerEntity>) {
    super();
    Object.assign(this, answerEntity);
  }
}
