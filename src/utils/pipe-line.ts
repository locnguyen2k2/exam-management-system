import * as _ from 'lodash';

export interface IPipeLine {
  filterOptions: any[];
  groups?: any[];
  pageOptions: any;
  lookups?: any[];
}

export function pipeLine({
  filterOptions,
  groups,
  pageOptions,
  lookups,
}: IPipeLine) {
  const paginate = !_.isNull(groups)
    ? [
        { $skip: pageOptions.skip },
        { $limit: pageOptions.take },
        { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
      ]
    : null;

  return [
    {
      $facet: {
        data: [
          ...filterOptions,
          ...(!Array.isArray(groups) ? paginate : []),
          ...(Array.isArray(lookups) ? lookups : []),
          ...(Array.isArray(groups) ? groups : []),
        ],
        pageInfo: [...filterOptions, { $count: 'numberRecords' }],
      },
    },
  ];
}
