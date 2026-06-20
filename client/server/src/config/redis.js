const { createClient } = require('redis');
const { redis } = require('./env');
const logger = require('../utils/logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({
      url: redis.url,
      socket: {
        reconnectStrategy: false,
      },
    });
    client.on('error', (err) => {
      console.error('[REDIS] Client error:', err.message);
    });
    await client.connect();
    logger.info('[REDIS] Connected');
  } catch (err) {
    logger.warn(`[REDIS] Unavailable — running without cache/pub-sub: ${err.message}`);
    client = null;
  }
  return client;
};

const getRedisClient = () => client;

const disconnectRedis = async () => {
  if (client) {
    await client.quit();
    logger.info('[REDIS] Connection closed');
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
