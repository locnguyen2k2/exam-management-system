import * as _ from 'lodash';

export function searchAtlas(index: string, keyword: string) {
  return !_.isEmpty(keyword)
    ? {
        $search: {
          index: index,
          text: {
            query: keyword,
            path: {
              wildcard: '*',
            },
            fuzzy: {},
          },
        },
      }
    : { $match: {} };
}

export function searchIndexes(keyword: string) {
  return !_.isEmpty(keyword)
    ? {
        $match: {
          $text: {
            $search: `\"${keyword}\"`,
          },
        },
      }
    : { $match: {} };
}
