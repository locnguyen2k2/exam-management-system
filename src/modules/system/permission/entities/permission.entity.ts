import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';

@ObjectType('PermissionModel')
@Entity('permission_entity')
export class PermissionEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string', nullable: false })
  name: string;

  @Field(() => String)
  @Column({ type: 'string' })
  value: string;

  @Field(() => String, { nullable: true, defaultValue: '' })
  @Column({ type: 'string', nullable: true, default: '' })
  remark: string = '';

  @Field(() => Boolean, { defaultValue: false })
  @Column({ type: 'boolean', default: false })
  status: boolean = false;

  constructor(permissionEntity: Partial<PermissionEntity>) {
    super();
    Object.assign(this, permissionEntity);
  }
}
