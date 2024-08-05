import { registerEnumType } from '@nestjs/graphql';

export enum QuestionLabelEnum {
  END_DOT = 'Câu 1.',
  END_COLON = 'Câu 1:',
  END_BRACKET = 'Câu 1)',
}

export enum AnswerLabelEnum {
  LOW_DOT = 'a.',
  LOW_COLON = 'a:',
  LOW_BRACKET = 'a)',
  UP_DOT = 'A.',
  UP_COLON = 'A:',
  UP_BRACKET = 'A)',
}

registerEnumType(QuestionLabelEnum, { name: 'QuestionLabelEnum' });
registerEnumType(AnswerLabelEnum, { name: 'AnswerLabelEnum' });
