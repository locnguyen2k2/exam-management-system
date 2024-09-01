import { Field, HideField, InputType, PartialType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { BaseDto } from '~/common/dtos/base.dto';
import { RoleEnum } from '~/modules/system/role/role.constant';

@InputType('RolePageOptions')
export class RolePageOptions extends PageOptionDto {
  @Field(() => [RoleEnum], {
    nullable: true,
  })
  readonly value?: RoleEnum[];
}

@InputType()
class RoleBaseDto extends BaseDto {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: false })
  value: string;

  @Field(() => String, { nullable: true })
  remark: string;

  @Field(() => Boolean, { nullable: true })
  enable: boolean;

  @Field(() => [String])
  permissionIds: string[];
}

@InputType('CreateRoleArgs')
export class RoleCreateDto extends RoleBaseDto {
  @HideField()
  createBy: string;
}

@InputType('UpdateRoleArgs')
export class UpdateRoleDto extends PartialType(RoleBaseDto) {
  @HideField()
  updateBy: string;
}
