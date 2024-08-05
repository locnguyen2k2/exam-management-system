import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: propertyName,
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(
          value: any,
          args?: ValidationArguments,
        ): Promise<boolean> | boolean {
          const passwordRegex = /^\S*(?=\S{6,})(?=\S*\d)(?=\S*[A-Za-z])\S*$/;
          return typeof value === 'string' && passwordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password format is incorrect';
        },
      },
    });
  };
}
