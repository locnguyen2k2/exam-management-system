import { registerEnumType } from '@nestjs/graphql';

// export enum LevelEnum {
//   VERY_EASY = 'very_easy',
//   EASY = 'easy',
//   STANDARD = 'standard',
//   HARD = 'hard',
//   VERY_HARD = 'very_hard',
// }

export enum LevelEnum {
  REMEMBERING = 'remembering',
  UNDERSTANDING = 'understanding',
  APPLYING = 'applying',
  ANALYZING = 'analyzing',
  EVALUATING = 'evaluating',
  CREATING = 'creating',
}

registerEnumType(LevelEnum, { name: 'LevelEnum' });
