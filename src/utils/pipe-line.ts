import * as _ from 'lodash';

export function pipeLine(
  pageOptions: any,
  filterOptions: any,
  lookups?: any[],
) {
  return !_.isNil(lookups)
    ? [
        {
          $facet: {
            data: [
              ...lookups,
              { $match: filterOptions },
              { $skip: pageOptions.skip },
              { $limit: pageOptions.take },
              { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
            ],
            pageInfo: [{ $match: filterOptions }, { $count: 'numberRecords' }],
          },
        },
      ]
    : [
        {
          $facet: {
            data: [
              { $match: filterOptions },
              { $skip: pageOptions.skip },
              { $limit: pageOptions.take },
              { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
            ],
            pageInfo: [{ $match: filterOptions }, { $count: 'numberRecords' }],
          },
        },
      ];
}
