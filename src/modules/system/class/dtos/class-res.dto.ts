import { Field, ObjectType } from '@nestjs/graphql';
import { ClassEntity } from '~/modules/system/class/entities/class.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { createPaginatedType } from '~/common/dtos/pagination/pagination.dto';

@ObjectType('ClassSimpleFields')
export class ClassSimpleDto extends ExtendedEntity {
  @Field(() => String)
  name: string;

  @Field(() => String)
  code: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  startYear: string;

  @Field(() => String)
  endYear: string;

  @Field(() => Boolean)
  enable: boolean;

  @Field(() => StatusShareEnum)
  status: StatusShareEnum;
}

@ObjectType('ClassPagination')
export class ClassPaginationDto extends createPaginatedType(ClassEntity) {}
