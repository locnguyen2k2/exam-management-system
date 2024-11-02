import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { AnswerService } from '~/modules/system/answer/answer.service';
import { AnswerResolver } from '~/modules/system/answer/answer.resolver';
// import { QuestionModule } from '~/modules/system/question/question.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnswerEntity]),
    // forwardRef(() => QuestionModule),
  ],
  providers: [AnswerResolver, AnswerService],
  exports: [AnswerService],
})
export class AnswerModule {}
