import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType()
@Entity()
export class ClassEntity extends ExtendedEntity {
  name: string;
  sku: string;
  page: number;
  items: string[] = [];
  countItems: number = 0;
}
