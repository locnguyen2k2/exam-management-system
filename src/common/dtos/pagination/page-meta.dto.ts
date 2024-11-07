import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';

export interface IPagination {
  pageOptions: PageOptionDto;
  numberRecords: number;
}

// Dữ liệu trả về chưa thông tin phân trang
@ObjectType('pagination')
export class PageMetaDto {
  @Field(() => String)
  readonly keyword: string;

  @Field(() => String)
  readonly sort: string;

  @Field(() => Int)
  readonly page: number;

  @Field(() => Int)
  readonly take: number;

  @Field(() => Int)
  readonly numberRecords: number;

  @Field(() => Int)
  readonly pages: number;

  @Field(() => Boolean)
  readonly hasPrev: boolean;

  @Field(() => Boolean)
  readonly hasNext: boolean;

  constructor({ pageOptions, numberRecords }: IPagination) {
    this.keyword = pageOptions.keyword;
    this.page = pageOptions.page;
    this.take = !pageOptions.all ? pageOptions.take : numberRecords;
    this.sort = pageOptions.sort;
    this.numberRecords = numberRecords;
    this.pages = Math.ceil(this.numberRecords / this.take)
      ? Math.ceil(this.numberRecords / this.take)
      : 0;
    this.hasPrev = this.page > 1;
    this.hasNext = this.page < this.pages;
  }
}
