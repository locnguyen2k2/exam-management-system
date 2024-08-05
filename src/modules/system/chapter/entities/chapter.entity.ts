import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExtendedEntity } from '~/common/entity/base.entity';
import { StatusShareEnum } from '~/common/enums/status-share.enum';

@ObjectType('ChapterModel', { description: 'Chapter Model' })
@Entity('chapter_entity')
export class ChapterEntity extends ExtendedEntity {
  @Field(() => String, {})
  @Column('string')
  label: string;

  @Field(() => String, {})
  @Column('string')
  name: string;

  @Field(() => String, { nullable: true })
  @Column('string', { nullable: true })
  description: string;

  @Field(() => String)
  @Column('string')
  lessonId: string;

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

  @Field(() => [String], {})
  @Column('string', { array: true })
  questionIds: string[] = [];

  constructor(chapterEntity: Partial<ChapterEntity>) {
    super();
    Object.assign(this, chapterEntity);
  }
}
