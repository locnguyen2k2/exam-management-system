import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'customText', async: false })
export class IsValidString implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (text.length === 0) return false;
    if (text?.startsWith(' ') || text?.endsWith(' ')) {
      return false;
    }
    if (text?.includes('  ')) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Văn bản không bắt đầu, kết thúc với khoảng trắng, hoặc 2 khoảng trắng liên tiếp.';
  }
}
