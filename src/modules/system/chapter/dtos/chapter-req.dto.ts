import { BaseDto } from '~/common/dtos/base.dto';
import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { Validate, ValidateNested } from 'class-validator';
import { IsValidStringId } from '~/common/decorators/id.decorator';
import { Type } from 'class-transformer';

@InputType('ChapterPageOptions')
export class ChapterPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  chapterStatus: StatusShareEnum[];
}

@InputType()
export class ChapterBaseDto extends BaseDto {
  @Field(() => String, { description: 'Đầu mục', nullable: true })
  label: string;

  @Field(() => String, { description: 'Tên chương' })
  name: string;

  @Field(() => String, { description: 'Mã học phần' })
  @Validate(IsValidStringId)
  lessonId: string;

  @Field(() => String, { description: 'Mô tả', nullable: true })
  description: string;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum;
}

@InputType('CreateChaptersArgs')
export class CreateChaptersDto {
  @Field(() => [ChapterBaseDto])
  @ValidateNested({ each: true })
  @Type(() => ChapterBaseDto)
  chapters: ChapterBaseDto[];

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
  @Field(() => String, { description: 'Mã chương ' })
  @Validate(IsValidStringId)
  chapterId: string;

  @Field(() => Boolean, { description: 'Trạng thái kích hoạt' })
  enable: boolean;
}

@InputType()
class ChapterStatusDto {
  @Field(() => String, { description: 'Mã chương ' })
  @Validate(IsValidStringId)
  chapterId: string;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;
}

@InputType('EnableChaptersArgs')
export class EnableChaptersDto {
  @Field(() => [EnableChapterDto])
  @ValidateNested({ each: true })
  @Type(() => EnableChapterDto)
  chaptersEnable: EnableChapterDto[];

  @HideField()
  updateBy: string;
}

@InputType('UpdateChaptersStatusArgs')
export class UpdateChaptersStatusDto {
  @Field(() => [ChapterStatusDto])
  @ValidateNested({ each: true })
  @Type(() => ChapterStatusDto)
  chaptersStatus: ChapterStatusDto[];

  @HideField()
  updateBy: string;
}
