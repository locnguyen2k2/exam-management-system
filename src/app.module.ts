import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '~/config';
import { SharedModule } from '~/shared/shared.module';
import { UsersModule } from '~/modules/system/user/user.module';
import { RoleModule } from '~/modules/system/role/role.module';
import { PermissionModule } from '~/modules/system/permission/permission.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard';
import { AuthModule } from '~/modules/auth/auth.module';
import { PermissionAuthGuard } from '~/modules/auth/guards/permission-auth.guard';
import { ExamModule } from '~/modules/system/exam/exam.module';
import { ChapterModule } from '~/modules/system/chapter/chapter.module';
import { LessonModule } from '~/modules/system/lession/lesson.module';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from '~/modules/auth/guards/gpl-throtle.guard';

const modules = [
  UsersModule,
  RoleModule,
  PermissionModule,
  AuthModule,
  ChapterModule,
  ExamModule,
  LessonModule,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: [`.env.local`, `.env.${process.env.NODE_ENV}`, '.env'],
      load: [...Object.values(config)],
    }),

    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        errorMessage: 'Phát hiện hành động đáng ngờ vui lòng thực hiện lại sau',
        throttlers: [{ ttl: seconds(10), limit: 5 }],
      }),
    }),

    SharedModule,
    ...modules,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionAuthGuard },
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}
