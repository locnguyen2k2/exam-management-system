import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { alphabet } from '~/modules/system/exam/exam.constant';
import { randomChars } from '~/utils/random';

@ValidatorConstraint({ name: 'customText', async: false })
export class IsValidSku implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) {
      args.object['sku'] = randomChars(3).toUpperCase();
      return true;
    } else {
      args.object['sku'] = args.object['sku'].toUpperCase();
    }
    return !(
      value.split('').some((char) => !alphabet.includes(char)) ||
      value?.length < 3 ||
      value?.length > 6
    );
  }

  defaultMessage(args: ValidationArguments) {
    return 'Mã sku phải là chữ cái và có độ dài từ 3 - 6 chữ cái';
  }
}
