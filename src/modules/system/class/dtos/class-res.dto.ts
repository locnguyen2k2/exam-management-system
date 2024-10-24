import { Field, ObjectType } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType('ClassSimpleFields')
export class ClassSimpleDto extends ExtendedEntity {
  @Field(() => String)
  name: string;

  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  description: string = '';

  @Field(() => String, { nullable: true })
  startYear: string = '';

  @Field(() => String, { nullable: true })
  endYear: string = '';

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  @Field(() => StatusShareEnum, { nullable: true })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;
}

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
