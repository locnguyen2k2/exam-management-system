import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';

@ObjectType('ClassPagination')
export class ClassPaginationDto {
  @Field(() => [ClassEntity])
  @IsArray()
  readonly data: ClassEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: ClassEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
