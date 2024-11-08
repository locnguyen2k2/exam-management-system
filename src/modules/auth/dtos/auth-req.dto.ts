import { Field, HideField, InputType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { Expose } from 'class-transformer';
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
  @Expose()
  email: string;
}

@InputType('ResetPasswordArgs')
export class ResetPasswordDto extends BaseDto {
  @Field(() => String)
  confirmToken: string;

  @Field(() => String)
  @Validate(IsValidPassword)
  @Expose()
  newPassword: string;

  @Field(() => String)
  @IsEmail()
  @Expose()
  email: string;
}

@InputType('LoginArgs')
export class LoginDto extends BaseDto {
  @Field(() => String)
  @IsEmail()
  @Expose()
  email: string;

  @Field(() => String)
  @Validate(IsValidPassword)
  @Expose()
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
  @Expose()
  email: string;

  @Field(() => String, { nullable: true })
  @MaxLength(255)
  @IsOptional()
  @Expose()
  photo: string = null;

  @Field(() => String, { nullable: true })
  @IsPhoneNumber()
  @IsOptional()
  @Expose()
  phone: string = null;

  @Field(() => String, { nullable: true })
  @MaxLength(255)
  @IsOptional()
  @Expose()
  address: string = null;

  @Field(() => GenderEnum, { nullable: true })
  @IsEnum(GenderEnum)
  @IsOptional()
  @Expose()
  gender: GenderEnum = null;

  @HideField()
  @Expose()
  roleIds: string[] = [];

  @HideField()
  createBy: number;
}

@InputType('RegisterArgs')
export class RegisterDto extends BaseRegisterDto {
  @Field(() => String)
  @Validate(IsValidPassword)
  @Expose()
  password: string;
}

@InputType('GenerateTokenArgs')
export class GenerateTokenDto extends BaseDto {
  @Field(() => String)
  token: string;
  @Field(() => TokenEntity)
  type: TokenEnum;
}
