import {
  Expose,
  plainToClass as NestPlainToClass,
  Transform,
} from 'class-transformer';
import { Field, HideField, InputType } from '@nestjs/graphql';
import { v4 as uuid } from 'uuid';
import { IsOptional } from 'class-validator';

@InputType()
export class BaseDto {
  @HideField()
  @Transform(() => uuid())
  id: string;

  @HideField()
  @Transform(() => new Date().toISOString())
  @Expose()
  created_at: string;

  @HideField()
  @Transform(() => new Date().toISOString())
  @Expose()
  updated_at: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  enable: boolean;

  static plainToClass<T>(this: new (...args: any[]) => T, obj: T): T {
    return NestPlainToClass(this, obj);
  }
}
