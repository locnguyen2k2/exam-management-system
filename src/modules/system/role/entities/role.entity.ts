import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';

@ObjectType('RoleModel', { description: 'Role model' })
@Entity('role_entity')
export class RoleEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  name: string;

  @Field(() => String)
  @Column({ type: 'string' })
  value: string;

  @Field(() => String, { defaultValue: '' })
  @Column({ type: 'string', default: '' })
  remark: string = '';

  @Field(() => [PermissionEntity])
  @Column('json', { array: true })
  permissions: PermissionEntity[] = [];

  constructor(roleEntity: Partial<RoleEntity>) {
    super();
    Object.assign(this, roleEntity);
  }
}
