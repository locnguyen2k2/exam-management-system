import { MongoRepository, ObjectLiteral } from 'typeorm';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';
import { pipeLine } from '~/utils/pipe-line';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';

interface IPaginate {
  filterOptions: any;
  pageOptions: PageOptionDto;
}

export const paginate = async <T extends ObjectLiteral>(
  repository: MongoRepository<T>,
  options: IPaginate,
  searchOption: any,
): Promise<PageDto<T>> => {
  const { pageOptions, filterOptions } = options;

  const pipes = [searchOption, ...pipeLine(pageOptions, filterOptions)];

  const [{ data, pageInfo }]: any[] = await repository
    .aggregate(pipes)
    .toArray();

  const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
  const pageMetaDto = new PageMetaDto({ pageOptions, numberRecords });

  return new PageDto(data, pageMetaDto);
};
