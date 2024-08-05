import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '~/modules/system/category/entities/category.entity';
import { CategoryResolver } from '~/modules/system/category/category.resolver';
import { CategoryService } from '~/modules/system/category/category.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  providers: [CategoryResolver, CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
