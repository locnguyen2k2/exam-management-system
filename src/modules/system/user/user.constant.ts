import { registerEnumType } from '@nestjs/graphql';

enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

enum EmailEnum {
  STUDENT = '@student.ctuet.edu.vn',
  TEACHER = '@ctuet.edu.vn',
}

export { GenderEnum, EmailEnum };

registerEnumType(GenderEnum, { name: 'GenderEnum' });
registerEnumType(EmailEnum, { name: 'EmailEnum' });
