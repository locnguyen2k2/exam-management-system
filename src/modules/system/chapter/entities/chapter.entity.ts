import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';

@ObjectType()
@Entity('chapter_entity')
export class ChapterEntity extends ExtendedEntity {
  @Field(() => String, { description: 'Đầu mục' })
  @Column('string')
  label: string;

  @Field(() => String, { description: 'Tên chương' })
  @Column('string')
  name: string;

  @Field(() => String, { nullable: true, description: 'Mô tả' })
  @Column('string', { nullable: true })
  description: string;

  @Field(() => StatusShareEnum, {
    nullable: true,
    defaultValue: StatusShareEnum.PRIVATE,
    description: 'Trạng thái chia sẻ',
  })
  @Column({
    type: 'enum',
    enum: StatusShareEnum,
    default: StatusShareEnum.PRIVATE,
  })
  status: StatusShareEnum = StatusShareEnum.PRIVATE;

  constructor(chapterEntity: Partial<ChapterEntity>) {
    super();
    Object.assign(this, chapterEntity);
  }
}
