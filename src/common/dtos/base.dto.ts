import { Expose, Transform } from 'class-transformer';
import { Field, HideField, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class BaseDto {
  @HideField()
  @Transform(() => new Date())
  @Expose()
  created_at: string;

  @HideField()
  @Transform(() => new Date())
  @Expose()
  updated_at: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  enable: boolean;
}
