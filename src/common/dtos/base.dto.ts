import {
  Expose,
  plainToClass as NestPlainToClass,
  Transform,
} from 'class-transformer';
import { Field, HideField, InputType } from '@nestjs/graphql';
import { v4 as uuid } from 'uuid';

@InputType()
export class BaseDto {
  @HideField()
  @Expose()
  @Transform(() => uuid())
  id: string;

  @HideField()
  @Expose()
  @Transform(() => new Date().toISOString())
  created_at: string;

  @HideField()
  @Expose()
  @Transform(() => new Date().toISOString())
  updated_at: string;

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  static plainToClass<T>(this: new (...args: any[]) => T, obj: T): T {
    return NestPlainToClass(this, obj);
  }
}
