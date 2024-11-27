import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { CategoryEnum } from '~/modules/system/question/enum/category.enum';

export interface IScale {
  percent: number;
  score?: number;
  chapterId: string;
  level: LevelEnum;
  category: CategoryEnum;
}
