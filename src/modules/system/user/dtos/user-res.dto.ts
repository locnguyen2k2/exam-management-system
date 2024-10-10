import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { GenderEnum } from '~/modules/system/user/user.constant';

@ObjectType('UserPagination')
export class UserPagination {
  @Field(() => [UserEntity])
  @IsArray()
  readonly data: UserEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: UserEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}

@ObjectType('UserProfile')
export class UserProfile {
  @Field(() => String)
  email: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  photo: string = '';

  @Field(() => String, { nullable: true })
  address: string = '';

  @Field(() => String, { nullable: true })
  phone: string = '';

  @Field(() => GenderEnum, { nullable: true })
  gender: GenderEnum = null;

  @Field(() => Boolean)
  status: boolean;

  @Field(() => Boolean)
  enable: boolean;

  @Field(() => [String])
  roles: string[] = [];
}
