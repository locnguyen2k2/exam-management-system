import { ChapterEntity } from './entities/chapter.entity';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';

export interface IDetailChapter {
  chapter: ChapterEntity;
  questions: QuestionEntity[];
}
