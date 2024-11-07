import { BaseDto } from '~/common/dtos/base.dto';
import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { IsEnum, Validate, ValidateNested } from 'class-validator';
import { IsValidId } from '~/common/decorators/id.decorator';
import { Type } from 'class-transformer';

@InputType('ChapterPageOptions')
export class ChapterPageOptions extends PageOptionDto {
  @Field(() => [StatusShareEnum], { nullable: true })
  chapterStatus: StatusShareEnum[];
}

@InputType()
export class ChapterBaseDto extends BaseDto {
  @Field(() => String, { description: 'Đầu mục' })
  label: string;

  @Field(() => String, { description: 'Tên chương' })
  name: string;

  @Field(() => String, { description: 'Mã học phần' })
  @Validate(IsValidId)
  lessonId: string;

  @Field(() => String, { nullable: true, description: 'Mô tả' })
  description: string = '';

  @Field(() => Boolean, { nullable: true, description: 'Trạng thái kích hoạt' })
  enable: boolean;

  @Field(() => StatusShareEnum, {
    nullable: true,
    defaultValue: StatusShareEnum.PRIVATE,
    description: 'Trạng thái chia sẻ',
  })
  @IsEnum(StatusShareEnum)
  status: StatusShareEnum = StatusShareEnum.PRIVATE;
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
  @Validate(IsValidId)
  chapterId: string;

  @Field(() => Boolean, { description: 'Trạng thái kích hoạt' })
  enable: boolean;
}

@InputType()
class ChapterStatusDto {
  @Field(() => String, { description: 'Mã chương ' })
  @Validate(IsValidId)
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
