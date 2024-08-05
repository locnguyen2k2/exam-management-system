import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import { RoleResolver } from '~/modules/system/role/role.resolver';
import { RoleService } from '~/modules/system/role/role.service';
import { PermissionModule } from '~/modules/system/permission/permission.module';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity]), PermissionModule],
  providers: [RoleResolver, RoleService],
  exports: [RoleService],
})
export class RoleModule {}
