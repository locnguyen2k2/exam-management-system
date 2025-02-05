import { Field, ObjectType } from '@nestjs/graphql';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { GenderEnum } from '~/modules/system/user/user.constant';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('UserPagination')
export class UserPagination extends createPaginatedType(UserEntity) {}

@ObjectType('UserProfile')
export class UserProfile {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String, { nullable: true })
  photo: string;

  @Field(() => String, { nullable: true })
  address: string;

  @Field(() => String, { nullable: true })
  phone: string;

  @Field(() => GenderEnum, { nullable: true })
  gender: GenderEnum;

  @Field(() => Boolean)
  status: boolean;

  @Field(() => Boolean)
  enable: boolean;

  @Field(() => [String])
  roles: string[] = [];
}
