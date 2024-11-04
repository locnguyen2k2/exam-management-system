import { forwardRef, Module } from '@nestjs/common';
import { QuestionResolver } from '~/modules/system/question/question.resolver';
import { QuestionService } from '~/modules/system/question/question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import { ChapterModule } from '~/modules/system/chapter/chapter.module';
import { ImageModule } from '~/modules/system/image/image.module';
import { ExamModule } from '~/modules/system/exam/exam.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionEntity]),
    forwardRef(() => ChapterModule),
    forwardRef(() => ExamModule),
    ChapterModule,
    ImageModule,
  ],
  providers: [QuestionResolver, QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
