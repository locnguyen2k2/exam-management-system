import { registerEnumType } from '@nestjs/graphql';

export enum SemesterEnum {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
  NATIONAL_DEFENSE = 'national_defense',
  SUMMER = 'summer',
  SUPPLEMENTAL = 'supplemental',
  GRADUATE = 'graduate',
}

registerEnumType(SemesterEnum, { name: 'SemesterEnum' });
