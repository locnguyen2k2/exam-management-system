import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { PermissionResolver } from '~/modules/system/permission/permission.resolver';
import { PermissionService } from '~/modules/system/permission/permission.service';
import { RoleModule } from '~/modules/system/role/role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionEntity]),
    forwardRef(() => RoleModule),
  ],
  providers: [PermissionResolver, PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
