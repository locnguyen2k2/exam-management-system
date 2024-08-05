import { LevelEnum } from '~/modules/system/exam/enums/level.enum';

export interface IScale {
  percent: number;
  chapterId: string;
  level: LevelEnum;
}
