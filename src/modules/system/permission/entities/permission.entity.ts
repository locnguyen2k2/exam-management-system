import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType('PermissionModel')
@Entity('permission_entity')
export class PermissionEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  name: string;

  @Field(() => String)
  @Column({ type: 'string' })
  value: string;

  @Field(() => String)
  @Column({ type: 'string' })
  remark: string = '';

  @Field(() => Boolean)
  @Column({ type: 'boolean' })
  status: boolean = false;

  constructor(permissionEntity: Partial<PermissionEntity>) {
    super();
    Object.assign(this, permissionEntity);
  }
}
