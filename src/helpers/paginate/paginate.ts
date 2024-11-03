import { pipeLine } from '~/utils/pipe-line';
import { MongoRepository, ObjectLiteral } from 'typeorm';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';

export interface IPaginate {
  filterOptions: any[];
  groups?: any[];
  pageOptions?: any;
  lookups?: any[];
}

export const paginate = async <T extends ObjectLiteral>(
  repository: MongoRepository<T>,
  options: IPaginate,
  searchOption: any,
): Promise<PageDto<T>> => {
  const { pageOptions, filterOptions, lookups, groups } = options;

  const pipes = [
    searchOption,
    ...pipeLine({ filterOptions, groups, pageOptions, lookups }),
  ];

  const [{ data, pageInfo }]: any[] = await repository
    .aggregate(pipes)
    .toArray();

  const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
  const pageMetaDto = new PageMetaDto({ pageOptions, numberRecords });

  return new PageDto(data, pageMetaDto);
};
