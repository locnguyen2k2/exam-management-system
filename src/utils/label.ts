import {
  AnswerLabelEnum,
  QuestionLabelEnum,
} from '~/modules/system/exam/enums/label.enum';
import { BusinessException } from '~/common/exceptions/biz.exception';

export function handleLabel(label: string, index: string) {
  switch (label) {
    case QuestionLabelEnum.END_BRACKET: {
      return `Câu ${index})`;
    }
    case QuestionLabelEnum.END_COLON: {
      return `Câu ${index}:`;
    }
    case QuestionLabelEnum.END_DOT: {
      return `Câu ${index}.`;
    }
    case AnswerLabelEnum.LOW_BRACKET: {
      return `${index.toLowerCase()})`;
    }
    case AnswerLabelEnum.LOW_DOT: {
      return `${index.toLowerCase()}.`;
    }
    case AnswerLabelEnum.LOW_COLON: {
      return `${index.toLowerCase()}:`;
    }
    case AnswerLabelEnum.UP_BRACKET: {
      return `${index.toUpperCase()})`;
    }
    case AnswerLabelEnum.UP_DOT: {
      return `${index.toUpperCase()}.`;
    }
    case AnswerLabelEnum.UP_COLON: {
      return `${index.toUpperCase()}:`;
    }
    default: {
      throw new BusinessException('400:Mâu câu không hợp lệ!');
    }
  }
}
