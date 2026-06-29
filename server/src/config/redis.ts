import { createClient, type RedisClientType } from 'redis';
import config from './env';
import logger from '../shared/utils/logger';

let client: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType | null> => {
  try {
    client = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) return new Error('Redis max retries reached');
          return Math.min(retries * 100, 3000);
        },
      },
    }) as RedisClientType;

    client.on('error',       (err: Error) => logger.warn(`[Redis] error: ${err.message}`));
    client.on('reconnecting', ()          => logger.info('[Redis] reconnecting...'));

    await client.connect();
    logger.info('[Redis] connected');
  } catch {
    logger.warn('[Redis] unavailable — running without cache/pub-sub');
    client = null;
  }
  return client;
};

export const getRedisClient = (): RedisClientType | null => client;
