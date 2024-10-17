import { registerEnumType } from '@nestjs/graphql';

export enum LevelEnum {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  STANDARD = 'standard',
  HARD = 'hard',
  VERY_HARD = 'very_hard',
}

registerEnumType(LevelEnum, { name: 'LevelEnum' });
