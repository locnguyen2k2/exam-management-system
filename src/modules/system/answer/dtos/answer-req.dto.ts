import {
  Field,
  Float,
  HideField,
  InputType,
  PartialType,
} from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';

@InputType('CreateAnswerArgs')
export class AnswerBaseDto extends BaseDto {
  @Field(() => String, {
    description:
      'Đáp án câu hỏi điền khuyết sẽ phân cách bằng ký hiệu [__] (đóng ngoặc vuông, 2 gạch dưới, đóng ngoặc vuông)',
  })
  value: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isCorrect: boolean;

  @Field(() => Float, { nullable: true })
  score: number;

  @Field(() => String, { nullable: true, description: 'Chú thích' })
  remark: string;
}

@InputType()
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
