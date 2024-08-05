import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { TokenEntity } from '~/modules/auth/entities/token.entity';
import { IsEnum, IsOptional, IsPhoneNumber, MaxLength } from 'class-validator';
import { Expose } from 'class-transformer';
import { GenderEnum } from '~/modules/system/user/user.constant';

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
  status: boolean = false;

  @Field(() => String, { nullable: true })
  @MaxLength(255)
  @Column({ type: 'string', length: 255 })
  @IsOptional()
  @Expose()
  photo: string = null;

  @Field(() => String, { nullable: true })
  @MaxLength(255)
  @Column({ type: 'string', length: 255 })
  @IsOptional()
  @Expose()
  address: string = null;

  @Field(() => GenderEnum, { nullable: true })
  @IsEnum(GenderEnum)
  @IsOptional()
  @Expose()
  gender: GenderEnum = null;

  @Field(() => String, { nullable: true })
  @IsPhoneNumber()
  @IsOptional()
  @Expose()
  phone: string = null;

  @Field(() => [String])
  @Column('string', { array: true })
  roleIds: string[];

  @Column(() => TokenEntity)
  tokens: TokenEntity[] = [];

  constructor(userEntity: Partial<UserEntity>) {
    super();
    Object.assign(this, userEntity);
  }
}
