import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { ExamService } from '~/modules/system/exam/exam.service';
import { ExamResolver } from '~/modules/system/exam/exam.resolver';
import { QuestionModule } from '~/modules/system/question/question.module';
import { ChapterModule } from '~/modules/system/chapter/chapter.module';
import { LessonModule } from '~/modules/system/lesson/lesson.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamEntity]),
    QuestionModule,
    ChapterModule,
    LessonModule,
    forwardRef(() => QuestionModule),
  ],
  providers: [ExamResolver, ExamService],
  exports: [ExamService],
})
export class ExamModule {}
