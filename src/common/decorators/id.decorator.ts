import { BadRequestException, createParamDecorator } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { regValidStringId } from '~/common/constants/regex.constant';

const checkId = (id: string) => {
  if (!regValidStringId.test(id)) {
    throw new BadRequestException(`Id '${id}' không hợp lệ!`);
  }
};

const IdParam = createParamDecorator((data, req) => {
  // Chỉ chứa ký tự thường, số và -, không bắt đầu hoặc kết thúc "-"
  const objectId = req.args[1];
  const key = Object.keys(req.args[1])[0];
  const ids = Array.isArray(objectId[key]) ? objectId[key] : [objectId[key]];

  ids.map((id) => checkId(id));

  return ids;
});

@ValidatorConstraint({ name: 'IsValidStringId', async: false })
class IsValidStringId implements ValidatorConstraintInterface {
  validate(args: ValidationArguments) {
    const ids = Array.isArray(args) ? args : [args];
    try {
      ids.map((id) => checkId(id));
    } catch (e) {
      return false;
    }
    return true;
  }

  defaultMessage() {
    return `Có Id không hợp lệ!`;
  }
}

export { IdParam, IsValidStringId };
