import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ChapterResolver } from '~/modules/system/chapter/chapter.resolver';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { LessonModule } from '~/modules/system/lession/lesson.module';
import { QuestionModule } from '~/modules/system/question/question.module';

@Module({
  imports: [
    forwardRef(() => LessonModule),
    forwardRef(() => QuestionModule),
    TypeOrmModule.forFeature([ChapterEntity]),
  ],
  providers: [ChapterResolver, ChapterService],
  exports: [ChapterService],
})
export class ChapterModule {}
