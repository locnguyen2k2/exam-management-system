// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Inject, Injectable } from '@nestjs/common';
// import { Cache } from 'cache-manager';
//
// export type TCacheKey = string;
// export type TCacheResult<T> = Promise<T | undefined>;
//
// @Injectable()
// export class CacheService {
//   private cache!: Cache;
//   constructor(@Inject(CACHE_MANAGER) cache: Cache) {
//     this.cache = cache;
//   }
//
//   private get redisClient() {
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     return this.cache.store.client;
//   }
//
//   public get<T>(key: TCacheKey): TCacheResult<T> {
//     return this.cache.get(key);
//   }
//
//   public set(key: TCacheKey, value: any, milliseconds: number) {
//     return this.cache.set(key, value, milliseconds);
//   }
//
//   public getClient() {
//     return this.redisClient;
//   }
// }
