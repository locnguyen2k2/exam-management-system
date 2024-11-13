import { Field, HideField, InputType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { IsValidPassword } from '~/common/decorators/password.decorator';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  MaxLength,
  Validate,
} from 'class-validator';
import { GenderEnum } from '~/modules/system/user/user.constant';
import { TokenEnum } from '~/modules/auth/auth.constant';
import { TokenEntity } from '~/modules/auth/entities/token.entity';

@InputType('ConfirmEmailArgs')
export class ConfirmEmailDto extends BaseDto {
  @Field(() => String)
  confirmToken: string;

  @Field(() => String)
  @IsEmail()
  email: string;
}

@InputType('ResetPasswordArgs')
export class ResetPasswordDto extends BaseDto {
  @Field(() => String)
  confirmToken: string;

  @Field(() => String)
  @Validate(IsValidPassword)
  newPassword: string;

  @Field(() => String)
  @IsEmail()
  email: string;
}

@InputType('LoginArgs')
export class LoginDto extends BaseDto {
  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String)
  @Validate(IsValidPassword)
  password: string;
}

@InputType()
export class BaseRegisterDto extends BaseDto {
  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  @MaxLength(255)
  photo: string;

  @Field(() => String, { nullable: true })
  @IsPhoneNumber()
  phone: string;

  @Field(() => String, { nullable: true })
  @MaxLength(255)
  address: string;

  @Field(() => GenderEnum, { nullable: true })
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @HideField()
  roleIds: string[] = [];

  @HideField()
  createBy: number;
}

@InputType('RegisterArgs')
export class RegisterDto extends BaseRegisterDto {
  @Field(() => String)
  @Validate(IsValidPassword)
  password: string;
}

@InputType('GenerateTokenArgs')
export class GenerateTokenDto extends BaseDto {
  @Field(() => String)
  token: string;

  @Field(() => TokenEntity)
  type: TokenEnum;
}
