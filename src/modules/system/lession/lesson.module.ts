import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEntity } from '~/modules/system/lession/entities/lesson.entity';
import { LessonResolver } from '~/modules/system/lession/lesson.resolver';
import { LessonService } from '~/modules/system/lession/lesson.service';
import { ExamModule } from '~/modules/system/exam/exam.module';
import { ChapterModule } from '~/modules/system/chapter/chapter.module';
import { ClassModule } from '~/modules/system/class/class.module';

@Module({
  imports: [
    forwardRef(() => ExamModule),
    forwardRef(() => ChapterModule),
    forwardRef(() => ClassModule),
    TypeOrmModule.forFeature([LessonEntity]),
  ],
  providers: [LessonResolver, LessonService],
  exports: [LessonService],
})
export class LessonModule {}
