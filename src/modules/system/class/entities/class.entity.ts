import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType()
@Entity()
export class ClassEntity extends ExtendedEntity {
  name: string;
  description: string;
  lessionIds: string[] = [];
}
