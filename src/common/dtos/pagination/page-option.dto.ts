import { IsOptional, Max, Min, Validate } from 'class-validator';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsValidString } from '~/common/decorators/string.decorator';

@ObjectType('PageOptions')
@InputType('pageOptionArgs')
export class PageOptionDto {
  @Field(() => String, { nullable: true })
  readonly keyword?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'Trường sắp xếp (Mặc định cột ngày tạo)',
  })
  @Validate(IsValidString)
  readonly sort?: string = 'created_at';

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Thứ tự sắp xếp (Mặc định giảm dần)',
  })
  readonly sorted?: boolean = false;

  @Field(() => Boolean, { nullable: true })
  readonly enable?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @Min(1)
  @IsOptional()
  readonly page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly take?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}
