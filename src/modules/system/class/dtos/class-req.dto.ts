import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { BaseDto } from '~/common/dtos/base.dto';
import { MaxLength } from 'class-validator';

@InputType('ClassPageOptions')
export class ClassPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  classStatus: StatusShareEnum[];

  @Field(() => [String], { description: 'Tên lớp' })
  lessonIds: string[];
}

@InputType()
class ClassBaseDto extends BaseDto {
  @Field(() => String, { description: 'Tên lớp' })
  name: string;

  @Field(() => String, { description: 'Mã lớp' })
  code: string;

  @Field(() => String, { nullable: true, description: 'Mô tả' })
  description: string;

  @Field(() => String)
  @MaxLength(4)
  startYear: string;

  @Field(() => String)
  @MaxLength(4)
  endYear: string;

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum;

  @Field(() => [String], { nullable: true })
  lessonIds: string[];
}

@InputType('CreateClassArgs')
export class CreateClassDto extends ClassBaseDto {
  @HideField()
  createBy: string;
}

@InputType('UpdateClassArgs')
export class UpdateClassDto extends PartialType(ClassBaseDto) {
  @HideField()
  updateBy: string;
}
