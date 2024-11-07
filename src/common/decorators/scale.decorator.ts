import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';

export function IsScale(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: propertyName,
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(
          value: IScale[],
          args?: ValidationArguments,
        ): Promise<boolean> | boolean {
          let total = 0;
          value.map((scale) => (total += scale.percent));
          return total === 100;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Tỷ lệ phải bằng 100';
        },
      },
    });
  };
}
