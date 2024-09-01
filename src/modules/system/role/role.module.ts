import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import { RoleResolver } from '~/modules/system/role/role.resolver';
import { RoleService } from '~/modules/system/role/role.service';
import { PermissionModule } from '~/modules/system/permission/permission.module';
import { UsersModule } from '~/modules/system/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity]),
    forwardRef(() => PermissionModule),
    forwardRef(() => UsersModule),
  ],
  providers: [RoleResolver, RoleService],
  exports: [RoleService],
})
export class RoleModule {}
