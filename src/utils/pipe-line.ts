import { IPaginate } from '~/helpers/paginate/paginate';

export function pipeLine({
  filterOptions,
  groups,
  pageOptions,
  lookups,
}: IPaginate) {
  const paginate = [
    { $skip: pageOptions.skip },
    ...(!pageOptions.all ? [{ $limit: pageOptions.take }] : []),
    { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
  ];

  if (Array.isArray(groups) && pageOptions.all) {
    filterOptions.splice(filterOptions.length - 2, 1);
  }

  return [
    {
      $facet: {
        data: [
          ...filterOptions,
          ...(!Array.isArray(groups) ? paginate : []),
          ...(Array.isArray(lookups) ? lookups : []),
          ...(Array.isArray(groups) ? groups : []),
        ],
        pageInfo: [
          ...(Array.isArray(groups)
            ? [filterOptions[0], filterOptions[1]]
            : filterOptions),
          { $count: 'numberRecords' },
        ],
      },
    },
  ];
}
