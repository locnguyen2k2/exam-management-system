import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { IsNotEmpty, Validate, ValidateNested } from 'class-validator';
import { IsValidStringId } from '~/common/decorators/id.decorator';
import { Expose, Type } from 'class-transformer';

@InputType('LessonPageOptions')
export class LessonPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  lessonStatus: StatusShareEnum[];

  // @Field(() => [String], { nullable: true })
  // classIds: string[];
}

@InputType()
class LessonBaseDto extends BaseDto {
  @Field(() => String, { nullable: true })
  label: string;

  @Field(() => String)
  @IsNotEmpty()
  @Expose()
  name: string;

  @Field(() => String, { nullable: true })
  description: string;

  @Field(() => [String])
  @Validate(IsValidStringId)
  classIds: string[];

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum;
}

@InputType('CreateLessonArgs')
export class CreateLessonDto {
  @Field(() => [LessonBaseDto])
  @ValidateNested({ each: true })
  @Type(() => LessonBaseDto)
  items: LessonBaseDto[];

  @HideField()
  createBy: string;
}

@InputType('EnableLessonArgs')
class EnableLessonDto {
  @Field(() => String, { description: 'Mã học phần' })
  @Validate(IsValidStringId)
  lessonId: string;

  @Field(() => Boolean, { description: 'Trạng thái kích  hoạt' })
  enable: boolean;
}

@InputType('EnableLessonsArgs')
export class EnableLessonsDto {
  @Field(() => [EnableLessonDto])
  @ValidateNested({ each: true })
  @Type(() => EnableLessonDto)
  lessonsEnable: EnableLessonDto[];
  @HideField()
  updateBy: string;
}

@InputType('UpdateLessonArgs')
export class UpdateLessonDto extends PartialType(LessonBaseDto) {
  // @Field(() => [String], { nullable: true })
  // chapterIds?: string[] = [];

  @HideField()
  updateBy: string;
}
