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
import { LessonModule } from '~/modules/system/lesson/lesson.module';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from '~/modules/auth/guards/gpl-throtle.guard';
import { ClassModule } from '~/modules/system/class/class.module';

const modules = [
  UsersModule,
  RoleModule,
  PermissionModule,
  AuthModule,
  ChapterModule,
  ExamModule,
  LessonModule,
  ClassModule,
];

@Module({
  imports: [
    // Tải và phân tích các cập key - value trong file .env và hợp nhất vào process.env
    ConfigModule.forRoot({
      isGlobal: true, // Sử dụng toàn cục ConfigModule
      expandVariables: true,
      envFilePath: [`.env.local`, `.env.${process.env.NODE_ENV}`, '.env'], // Thiết lập thêm các file biến môi trường
      load: [...Object.values(config)], // Load các configuration objects
    }),

    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        errorMessage:
          'Phát hiện hành động đáng ngờ vui lòng thực hiện lại sau 10 giây',
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
