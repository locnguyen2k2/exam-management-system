import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { BaseDto } from '~/common/dtos/base.dto';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';

@InputType('PermissionPageOptions')
export class PermissionPageOptions extends PageOptionDto {
  @Field(() => [PermissionEnum], {
    nullable: true,
  })
  readonly value?: PermissionEntity[];

  @Field(() => Boolean, {
    nullable: true,
  })
  readonly permissionStatus?: boolean;
}

@InputType()
class PermissionBaseDto extends BaseDto {
  @Field(() => String)
  name: string;

  @Field(() => PermissionEnum)
  value: PermissionEnum;

  @Field(() => String, { nullable: true })
  remark: string;

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  @Field(() => Boolean, { nullable: true })
  status: boolean;
}

@InputType('createPermissionArgs')
export class CreatePermissionDto extends PermissionBaseDto {
  @HideField()
  createBy: string;
}

@InputType('updatePermissionArgs')
export class UpdatePermissionDto extends PartialType(PermissionBaseDto) {
  @HideField()
  updateBy: string;
}
