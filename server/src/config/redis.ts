// @ts-nocheck
const { createClient } = require('redis');
const { redis } = require('./env');
const logger = require('../utils/logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({
      url: redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Redis max retries reached');
          return Math.min(retries * 100, 3000);
        },
      },
    });
    client.on('error', (err) => logger.warn(`[Redis] error: ${err?.message || err}`));
    client.on('reconnecting', () => logger.info('[Redis] reconnecting...'));
    await client.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis unavailable — running without cache/pub-sub');
    client = null;
  }
  return client;
};

const getRedisClient = () => client;

module.exports = { connectRedis, getRedisClient };

export {};
