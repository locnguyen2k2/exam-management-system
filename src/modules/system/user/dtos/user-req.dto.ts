import { Field, HideField, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsPassword } from '~/common/decorators/password.decorator';
import { BaseDto } from '~/common/dtos/base.dto';
import { IsEmail } from 'class-validator';
import { Expose } from 'class-transformer';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { EmailEnum, GenderEnum } from '~/modules/system/user/user.constant';

@InputType('UserPageOptions')
export class UserPageOptions extends PageOptionDto {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Trạng thái người dùng',
  })
  readonly userStatus?: boolean;

  @Field(() => [GenderEnum], {
    nullable: true,
  })
  readonly gender?: GenderEnum[];

  @Field(() => [EmailEnum], {
    nullable: true,
  })
  readonly email?: EmailEnum[] = [];
}

@InputType()
class UserBaseDto extends BaseDto {
  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;
}

@InputType('CreateUserArgs')
export class UserCreateDto extends UserBaseDto {
  @Field(() => String)
  @IsEmail()
  @Expose()
  email: string;

  @Field(() => String)
  @IsPassword()
  @Expose()
  password: string;

  @Field(() => [String])
  @Expose()
  roleIds: string[];

  @HideField()
  createBy: string;
}

@InputType('CreateAdminArgs')
export class AdminCreateDto extends UserCreateDto {
  @Field(() => Boolean, { nullable: true })
  status: boolean = false;
}

@InputType('UpdateUserArgs')
export class UserUpdateDto extends PartialType(UserBaseDto) {
  @HideField()
  updateBy: string;
}
