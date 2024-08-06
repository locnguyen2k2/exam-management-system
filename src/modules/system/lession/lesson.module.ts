import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEntity } from '~/modules/system/lession/entities/lesson.entity';
import { LessonResolver } from '~/modules/system/lession/lesson.resolver';
import { LessonService } from '~/modules/system/lession/lesson.service';
import { ExamModule } from '~/modules/system/exam/exam.module';

@Module({
  imports: [
    forwardRef(() => ExamModule),
    TypeOrmModule.forFeature([LessonEntity]),
  ],
  providers: [LessonResolver, LessonService],
  exports: [LessonService],
})
export class LessonModule {}
