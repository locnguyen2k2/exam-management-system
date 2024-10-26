import { forwardRef, Module } from '@nestjs/common';
import { UserResolver } from '~/modules/system/user/user.resolver';
import { UserService } from '~/modules/system/user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { RoleModule } from '~/modules/system/role/role.module';
import { ImageModule } from '~/modules/system/image/image.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => RoleModule),
    RoleModule,
    ImageModule,
  ],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UsersModule {}
