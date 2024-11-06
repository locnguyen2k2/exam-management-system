import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'customText', async: false })
export class NoSpace implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    return /^\S*$/.test(text);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Văn bản không chứa khoản trắng!';
  }
}
