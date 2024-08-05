import { Module } from '@nestjs/common';
import { UserResolver } from '~/modules/system/user/user.resolver';
import { UserService } from '~/modules/system/user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { RoleModule } from '~/modules/system/role/role.module';
import { PermissionModule } from '~/modules/system/permission/permission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    RoleModule,
    PermissionModule,
  ],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UsersModule {}
