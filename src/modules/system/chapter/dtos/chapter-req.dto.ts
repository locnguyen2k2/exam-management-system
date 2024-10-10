import { BaseDto } from '~/common/dtos/base.dto';
import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { IsEnum } from 'class-validator';

@InputType('ChapterPageOptions')
export class ChapterPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  chapterStatus: StatusShareEnum[];
}

@InputType()
export class ChapterBaseDto extends BaseDto {
  @Field(() => String, {})
  label: string;

  @Field(() => String, {})
  name: string;

  @Field(() => String, {})
  lessonId: string;

  @Field(() => String, { nullable: true })
  description: string = '';

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  @Field(() => StatusShareEnum, {
    nullable: true,
    defaultValue: StatusShareEnum.PRIVATE,
    description: 'Trạng thái chia sẻ',
  })
  @IsEnum(StatusShareEnum)
  status: StatusShareEnum = StatusShareEnum.PRIVATE;
}

@InputType('CreateChapterArgs')
export class CreateChapterDto extends ChapterBaseDto {
  @HideField()
  createBy: string;
}

@InputType('UpdateChapterArgs')
export class UpdateChapterDto extends PartialType(ChapterBaseDto) {
  @HideField()
  updateBy: string;
}

@InputType()
class EnableChapterDto {
  @Field(() => String)
  chapterId: string;

  @Field(() => Boolean)
  enable: boolean;
}

@InputType()
class ChapterStatusDto {
  @Field(() => String)
  chapterId: string;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;
}

@InputType('EnableChaptersArgs')
export class EnableChaptersDto {
  @Field(() => [EnableChapterDto])
  chaptersEnable: EnableChapterDto[];
  @HideField()
  updateBy: string;
}

@InputType('UpdateChaptersStatusArgs')
export class UpdateChaptersStatusDto {
  @Field(() => [ChapterStatusDto])
  chaptersStatus: ChapterStatusDto[];
  @HideField()
  updateBy: string;
}
