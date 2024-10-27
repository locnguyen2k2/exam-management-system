import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType('AnswerModel')
@Entity('answer_entity')
export class AnswerEntity extends ExtendedEntity {
  @Field(() => String, { nullable: true })
  @Column({ type: 'string' })
  label: string;

  @Field(() => String)
  @Column({ type: 'string' })
  value: string;

  @Field(() => String, {
    nullable: true,
    defaultValue: null,
    description: 'Chú thích của đáp án',
  })
  @Column({ type: 'string', nullable: true, default: null })
  remark: string = null;

  constructor(answerEntity: Partial<AnswerEntity>) {
    super();
    Object.assign(this, answerEntity);
  }
}
