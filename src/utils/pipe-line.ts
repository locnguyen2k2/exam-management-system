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
  const paginate = [
    { $skip: pageOptions.skip },
    { $limit: pageOptions.take },
    { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
  ];

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
            ? [...paginate, filterOptions[0], filterOptions[1]]
            : filterOptions),
          { $count: 'numberRecords' },
        ],
      },
    },
  ];
}
