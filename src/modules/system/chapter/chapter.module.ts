import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChapterEntity } from '~/modules/system/chapter/entities/chapter.entity';
import { ChapterResolver } from '~/modules/system/chapter/chapter.resolver';
import { ChapterService } from '~/modules/system/chapter/chapter.service';
import { LessonModule } from '~/modules/system/lession/lesson.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChapterEntity]), LessonModule],
  providers: [ChapterResolver, ChapterService],
  exports: [ChapterService],
})
export class ChapterModule {}
