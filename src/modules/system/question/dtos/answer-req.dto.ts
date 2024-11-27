import { Field, Float, InputType } from '@nestjs/graphql';
import { BaseDto } from '~/common/dtos/base.dto';
import { IsNotEmpty, IsOptional, Min } from 'class-validator';

@InputType('CreateAnswerArgs')
export class AnswerBaseDto extends BaseDto {
  @Field(() => String, {
    description:
      'Đáp án câu hỏi điền khuyết sẽ phân cách bằng ký hiệu [__] (đóng ngoặc vuông, 2 gạch dưới, đóng ngoặc vuông)',
  })
  @IsNotEmpty()
  value: string;

  @Field(() => Boolean, { nullable: true })
  isCorrect: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  score: number;

  @Field(() => String, { description: 'Chú thích', nullable: true })
  remark: string;
}
