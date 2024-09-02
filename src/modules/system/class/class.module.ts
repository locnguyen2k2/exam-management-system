import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';
import { ClassResolver } from '~/modules/system/class/class.resolver';
import { ClassService } from '~/modules/system/class/class.service';
import { LessonModule } from '~/modules/system/lesson/lesson.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassEntity]),
    forwardRef(() => LessonModule),
  ],
  providers: [ClassResolver, ClassService],
  exports: [ClassService],
})
export class ClassModule {}
