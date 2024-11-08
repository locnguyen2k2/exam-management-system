import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { regValidPassword } from '~/common/constants/regex.constant';

@ValidatorConstraint({ name: 'IsValidPassword', async: false })
export class IsValidPassword implements ValidatorConstraintInterface {
  validate(value: string) {
    return typeof value === 'string' && regValidPassword.test(value);
  }

  defaultMessage() {
    return 'Mật khẩu ít nhất 6 ký tự, phải có ký tự và số';
  }
}
