import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { IsValidPassword } from '~/common/decorators/password.decorator';
import { BaseDto } from '~/common/dtos/base.dto';
import { IsEmail, Validate } from 'class-validator';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { EmailEnum, GenderEnum } from '~/modules/system/user/user.constant';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { FileUpload } from '~/modules/system/image/image.interface';
import { IsValidStringId } from '~/common/decorators/id.decorator';

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

@InputType('ChangePasswordArgs')
export class ChangePasswordDto {
  @Field(() => String)
  @Validate(IsValidPassword)
  newPassword: string;

  @Field(() => String)
  @Validate(IsValidPassword)
  oldPassword: string;

  @HideField()
  updateBy: string;
}

@InputType()
class UserBaseDto extends BaseDto {
  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => GenderEnum, { nullable: true })
  gender: GenderEnum;

  @Field(() => GraphQLUpload, { nullable: true })
  photo: FileUpload;

  @Field(() => String, { nullable: true })
  address: string;

  @Field(() => String, { nullable: true })
  phone: string;
}

@InputType('CreateUserArgs')
export class UserCreateDto extends UserBaseDto {
  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String)
  @Validate(IsValidPassword)
  password: string;

  @Field(() => [String])
  @Validate(IsValidStringId)
  roleIds: string[];

  @HideField()
  createBy: string;
}

@InputType('CreateAdminArgs')
export class AdminCreateDto extends UserCreateDto {
  @Field(() => Boolean, { nullable: true })
  status: boolean;
}

@InputType('UpdateInfoArgs')
export class UpdateInfoDto extends PartialType(UserBaseDto) {
  @HideField()
  enable: boolean;
  password: string;
  email: string;
  updateBy: string;
}

@InputType('UpdateUserArgs')
export class UpdateUserDto extends PartialType(UserBaseDto) {
  @Field(() => [String], { nullable: true })
  @Validate(IsValidStringId)
  roleIds: string[];

  @HideField()
  enable: boolean;
  password: string;
  email: string;
  updateBy: string;
}
