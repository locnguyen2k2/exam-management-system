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

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', length: 600 })
  password: string = null;

  @Field(() => Boolean, {
    description: 'Trạng thái xác thực',
  })
  @Column({ type: 'boolean' })
  status: boolean = false;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', length: 255 })
  photo: string = null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string', length: 255 })
  address: string = '';

  @Field(() => GenderEnum, { nullable: true })
  @Column({ type: 'enum', enum: GenderEnum })
  gender: GenderEnum = null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'string' })
  phone: string = '';

  @Field(() => [RoleEntity])
  @Column('json', { array: true })
  roles: RoleEntity[] = [];

  @Column(() => TokenEntity)
  tokens: TokenEntity[] = [];

  constructor(userEntity: Partial<UserEntity>) {
    super();
    Object.assign(this, userEntity);
  }
}
