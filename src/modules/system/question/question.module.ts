import { forwardRef, Module } from '@nestjs/common';
import { QuestionResolver } from '~/modules/system/question/question.resolver';
import { QuestionService } from '~/modules/system/question/question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { ChapterModule } from '~/modules/system/chapter/chapter.module';
import { ImageModule } from '~/modules/system/image/image.module';
import { ExamModule } from '~/modules/system/exam/exam.module';
import { AnswerModule } from '~/modules/system/answer/answer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionEntity]),
    forwardRef(() => AnswerModule),
    forwardRef(() => ChapterModule),
    forwardRef(() => ExamModule),
    AnswerModule,
    ChapterModule,
    ImageModule,
  ],
  providers: [QuestionResolver, QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
