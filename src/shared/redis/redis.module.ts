// import { Global, Module } from '@nestjs/common';
// // import {
// //   RedisModule as NestRedisModule,
// //   RedisService,
// // } from '@liaoliaots/nestjs-redis';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
// import { ConfigKeyPaths, IRedisConfig } from '~/config';
// import { CacheService } from '~/shared/redis/cache.service';
// import { redisStore } from 'cache-manager-redis-store';
// import { envNumber } from '~/utils/env';
//
// const timeOut = envNumber('REDIS_TIME_OUT');
//
// @Global()
// @Module({
//   imports: [
//     CacheModule.registerAsync({
//       imports: [ConfigModule],
//       useFactory: async (configService: ConfigService<ConfigKeyPaths>) => {
//         const configs = configService.get<IRedisConfig>('redis');
//         const options = {
//           socket: {
//             host: configs.host,
//             port: configs.port,
//             reconnectStrategy: (retries: any) => {
//               console.log(`redis.reconnect.attempt.${retries}`);
//               return 1000 * timeOut;
//             },
//           },
//           disableOfflineQueue: true,
//           password: configs.password,
//         };
//         const store = await redisStore(options);
//         const redisClient = store.getClient();
//         const restartRedisService = async () => {
//           await redisClient.disconnect();
//           await redisClient.connect();
//         };
//
//         redisClient.on('connect', () =>
//           console.log('redis.connection.connected'),
//         );
//         redisClient.on('ready', () => console.log('redis.connection.ready'));
//         redisClient.on('error', (error) => {
//           console.log({ err: error.message }, 'redis.connection.error');
//
//           if (!error.code) setTimeout(restartRedisService, 1000 * timeOut);
//         });
//
//         return {
//           isGlobal: true,
//           store: store,
//         } as CacheModuleAsyncOptions;
//       },
//       inject: [ConfigService],
//     }),
//
//     // NestRedisModule.forRootAsync({
//     //   imports: [ConfigModule],
//     //   useFactory: (configService: ConfigService<ConfigKeyPaths>) => ({
//     //     readyLog: true,
//     //     config: configService.get<IRedisConfig>('redis'),
//     //   }),
//     //   inject: [ConfigService],
//     // }),
//   ],
//   providers: [
//     CacheService,
//     // {
//     //   provide: Symbol('REDIS_CLIENT'),
//     //   useFactory: (redisService: RedisService) => {
//     //     return redisService.getOrThrow();
//     //   },
//     //   inject: [RedisService],
//     // },
//   ],
//   exports: [CacheService, CacheModule],
// })
// export class RedisModule {}
