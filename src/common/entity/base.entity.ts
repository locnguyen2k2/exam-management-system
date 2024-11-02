import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity as NestedBaseEntity,
  Column,
  CreateDateColumn,
  ObjectIdColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

@ObjectType()
export abstract class BaseEntity extends NestedBaseEntity {
  @ObjectIdColumn()
  _id: string;

  @PrimaryGeneratedColumn()
  @Field(() => String)
  id: string = uuid();

  @Field(() => Boolean, {
    description: 'Trạng thái quản lý',
    defaultValue: false,
  })
  @Column({ type: 'boolean', default: false })
  enable: boolean = false;

  @Field(() => String, { name: 'createdAt' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'date',
  })
  created_at: string = new Date().toISOString();

  @Field(() => String, { name: 'updatedAt' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'date',
  })
  updated_at: string = new Date().toISOString();
}

@ObjectType()
export abstract class ExtendedEntity extends BaseEntity {
  @Field(() => String, {
    nullable: true,
    description: 'Tạo bởi',
    name: 'createBy',
  })
  @Column({
    name: 'create_by',
    update: false,
    nullable: true,
    comment: 'Tạo bởi',
  })
  create_by: string;

  @Field(() => String, {
    name: 'updateBy',
    nullable: true,
    description: 'Cập nhật bởi',
  })
  @Column({ name: 'update_by', nullable: true, comment: 'Cập nhật bơi' })
  update_by: string;

  @VirtualColumn({
    query: (alias) =>
      `SELECT email FROM user_entity WHERE id = ${alias}.create_by`,
  })
  creator: string;

  @VirtualColumn({
    query: (alias) =>
      `SELECT email FROM user_entity WHERE id = ${alias}.update_by`,
  })
  updater: string;
}
