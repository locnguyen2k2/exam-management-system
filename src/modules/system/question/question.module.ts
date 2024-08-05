import { Module } from '@nestjs/common';
import { QuestionResolver } from '~/modules/system/question/question.resolver';
import { QuestionService } from '~/modules/system/question/question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { AnswerModule } from '~/modules/system/answer/answer.module';
import { ChapterModule } from '~/modules/system/chapter/chapter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionEntity]),
    AnswerModule,
    ChapterModule,
  ],
  providers: [QuestionResolver, QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
