import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { TokenEntity } from '~/modules/auth/entities/token.entity';
import { GenderEnum } from '~/modules/system/user/user.constant';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';

@ObjectType('UserModel', { description: 'User Model' })
@Entity('user_entity', { comment: 'User Entity' })
export class UserEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  firstName: string;

  @Field(() => String)
  @Column({ type: 'string' })
  lastName: string;

  @Field(() => String)
  @Column({ type: 'string' })
  email: string;

  @Field(() => String)
  @Column({ type: 'string', length: 600, nullable: true, default: null })
  password: string;

  @Field(() => Boolean, {
    description: 'Trạng thái xác thực',
    defaultValue: false,
  })
  @Column({ type: 'boolean', default: false })
  status: boolean;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', length: 255, default: '' })
  photo: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', length: 255, default: '' })
  address: string = null;

  @Field(() => GenderEnum, { nullable: true })
  @Column({ type: 'enum', enum: GenderEnum, default: null })
  gender: GenderEnum;

  @Field(() => String, { nullable: true, defaultValue: '' })
  @Column({ type: 'string', default: '' })
  phone: string = null;

  @Field(() => [RoleEntity])
  @Column('json', { array: true, default: [] })
  roles: RoleEntity[];

  @Column(() => TokenEntity)
  tokens: TokenEntity[] = [];

  constructor(userEntity: Partial<UserEntity>) {
    super();
    Object.assign(this, userEntity);
  }
}
