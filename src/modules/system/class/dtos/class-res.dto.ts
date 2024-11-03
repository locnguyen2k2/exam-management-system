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
export class ClassPaginationDto extends createPaginatedType(ClassEntity) {}
