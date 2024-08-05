import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';

@ObjectType('PermissionPagination')
export class PermissionPaginationDto {
  @Field(() => [PermissionEntity])
  @IsArray()
  readonly data: PermissionEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: PermissionEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
