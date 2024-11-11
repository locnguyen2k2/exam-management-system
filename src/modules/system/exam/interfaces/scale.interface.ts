import { LevelEnum } from '~/modules/system/exam/enums/level.enum';
import { CategoryEnum } from '~/modules/system/category/category.enum';

export interface IScale {
  percent: number;
  chapterId: string;
  level: LevelEnum;
  category: CategoryEnum;
}
