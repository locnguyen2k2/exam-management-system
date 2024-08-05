import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';

@ObjectType('RolePagination')
export class RolePagination {
  @Field(() => [RoleEntity])
  @IsArray()
  readonly data: RoleEntity[];

  @Field(() => PageMetaDto)
  readonly meta: PageMetaDto;

  constructor(data: RoleEntity[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
