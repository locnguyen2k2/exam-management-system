import {
  Expose,
  plainToClass as NestPlainToClass,
  Transform,
} from 'class-transformer';
import { Field, HideField } from '@nestjs/graphql';
import { v4 as uuid } from 'uuid';

export abstract class BaseDto {
  @HideField()
  @Expose()
  @Transform(() => uuid())
  id: string;

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  static plainToClass<T>(this: new (...args: any[]) => T, obj: T): T {
    return NestPlainToClass(this, obj);
  }
}
