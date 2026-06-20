// @ts-nocheck
const { createClient } = require('redis');
const { redis } = require('./env');
const logger = require('../utils/logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({
      url: redis.url,
      socket: { reconnectStrategy: false },
    });
    client.on('error', () => {});
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
