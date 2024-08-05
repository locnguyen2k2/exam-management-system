import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { CategoryEnum } from '~/modules/system/category/category.enum';

@ObjectType('CategoryModel')
@Entity('category_entity')
export class CategoryEntity extends ExtendedEntity {
  @Field(() => String)
  @Column({ type: 'string' })
  name: string;

  @Field(() => CategoryEnum)
  @Column({ type: 'enum', enum: CategoryEnum })
  value: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @Column({ type: 'string', nullable: true, default: null })
  remark: string = null;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @Column({ type: 'boolean', nullable: true, default: false })
  status: boolean = false;

  constructor(categoryEntity: Partial<CategoryEntity>) {
    super();
    Object.assign(this, categoryEntity);
  }
}
