import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { IScale } from '~/modules/system/exam/interfaces/scale.interface';

@ValidatorConstraint({ name: 'IsValidScale', async: false })
export class IsValidScale implements ValidatorConstraintInterface {
  validate(value: IScale[]) {
    let total = 0;
    value.map((scale) => (total += scale.percent));
    return total === 100;
  }

  defaultMessage() {
    return 'Tỷ lệ phải bằng 100';
  }
}
