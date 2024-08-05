import { registerEnumType } from '@nestjs/graphql';

export enum StatusShareEnum {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

registerEnumType(StatusShareEnum, { name: 'StatusShareEnum' });
