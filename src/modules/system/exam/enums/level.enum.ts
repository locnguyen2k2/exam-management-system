import { registerEnumType } from '@nestjs/graphql';

export enum LevelEnum {
  VERYEASY = 'very_easy',
  EASY = 'easy',
  STANDARD = 'standard',
  HARD = 'hard',
  VERYHARD = 'very_hard',
}

registerEnumType(LevelEnum, { name: 'LevelEnum' });
