import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';

@InputType('AnswerPageOptions')
export class AnswerPageOptions extends PageOptionDto {}

@InputType()
class AnswerBaseDto extends BaseDto {
  // @HideField()
  // label: string = '';

  @Field(() => String)
  value: string;

  @Field(() => String, { nullable: true })
  remark: string;
}

@InputType('CreateAnswersArgs')
export class CreateAnswersDto extends BaseDto {
  @Field(() => [AnswerBaseDto])
  items: AnswerBaseDto[];

  @HideField()
  createBy: string = null;
}

@InputType('UpdateAnswerArgs')
export class UpdateAnswerDto extends PartialType(AnswerBaseDto) {
  @HideField()
  updateBy: string = null;
}
