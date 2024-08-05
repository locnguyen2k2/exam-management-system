import { registerEnumType } from '@nestjs/graphql';

export enum LevelEnum {
  REMEMBERING = 'remembering',
  UNDERSTANDING = 'understanding',
  APPLYING = 'applying',
  ANALYZING = 'analyzing',
  EVALUATING = 'evaluating',
  CREATING = 'creating',
}

registerEnumType(LevelEnum, { name: 'LevelEnum' });
