import { pipeLine } from '~/utils/pipe-line';
import { MongoRepository, ObjectLiteral } from 'typeorm';
import { PageDto } from '~/common/dtos/pagination/pagination.dto';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';

export interface IPaginate {
  filterOptions: any[];
  pageOptions: any;
  groups?: any[];
  lookups?: any[];
}

export const paginate = async <T extends ObjectLiteral>(
  repository: MongoRepository<T>,
  options: IPaginate,
  searchOption: any,
): Promise<PageDto<T>> => {
  const { pageOptions } = options;
  const pipes = [searchOption, ...pipeLine(options)];
  const [{ data, pageInfo }]: any[] = await repository
    .aggregate(pipes)
    .toArray();

  const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
  const pageMetaDto = new PageMetaDto({ pageOptions, numberRecords });

  return new PageDto(data, pageMetaDto);
};
