import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';

@InputType('LessonPageOptions')
export class LessonPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  lessonStatus: StatusShareEnum[];
}

@InputType()
class LessonBaseDto extends BaseDto {
  @Field(() => String)
  label: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string;

  @Field(() => Boolean)
  enable: boolean;

  @Field(() => [String], { nullable: true })
  classIds?: string[] = [];

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;
}

@InputType('CreateLessonArgs')
export class CreateLessonDto {
  @Field(() => [LessonBaseDto])
  items: LessonBaseDto[];

  @HideField()
  createBy: string;
}

@InputType('UpdateLessonArgs')
export class UpdateLessonDto extends PartialType(LessonBaseDto) {
  @HideField()
  updateBy: string;
}