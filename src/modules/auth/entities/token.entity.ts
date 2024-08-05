import { Column, Entity } from 'typeorm';
import { BaseEntity } from '~/common/entity/base.entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { TokenEnum } from '~/modules/auth/auth.constant';

@ObjectType('TokenModel')
@Entity('token_entity')
export class TokenEntity extends BaseEntity {
  @Field(() => String)
  @Column({ length: 500 })
  value: string;

  @Field(() => TokenEnum)
  @Column({ type: 'enum', enum: TokenEnum })
  type: TokenEnum;

  @Field(() => String)
  @Column()
  expired_at: Date;

  constructor(tokenEntity: Partial<TokenEntity>) {
    super();
    Object.assign(this, tokenEntity);
  }
}
