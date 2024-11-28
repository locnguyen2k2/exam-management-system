import { registerEnumType } from '@nestjs/graphql';

export enum CategoryEnum {
  EASSAY = 'essay',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_IN = 'fill_in',
  MATCHING = 'matching',
  ORDERING = 'ordering',
  IMAGE_BASED = 'image_based',
}

registerEnumType(CategoryEnum, {
  name: 'CategoryEnum',
  description: 'Loại câu hỏi',
});
