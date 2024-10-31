import { Field, ObjectType } from '@nestjs/graphql';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { Type } from '@nestjs/common';

@ObjectType('Pagination')
export class PageDto<T> {
  readonly data: T[];
  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}

export function createPaginatedType<T>(classRef: Type<T>) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [classRef])
    data: T[];

    @Field(() => PageMetaDto)
    meta: PageMetaDto;

    protected constructor(data: T[], meta: PageMetaDto) {
      this.data = data;
      this.meta = meta;
    }
  }

  return PaginatedType;
}
