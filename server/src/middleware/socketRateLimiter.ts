// @ts-nocheck
const { getRedisClient } = require('../config/redis');
const ApiError = require('../utils/ApiError');

/**
 * Limits Socket.IO connections per IP to 30 per minute.
 * Uses Redis INCR with expiry to work across multiple instances.
 */
module.exports = async (socket, next) => {
  const client = getRedisClient();
  if (!client) return next(); // If Redis unavailable, allow (fallback).

  const ip = socket.handshake.address;
  const key = `socketRate:${ip}`;
  try {
    const count = await client.incr(key);
    if (count === 1) {
      // Set TTL of 60 seconds on first hit
      await client.expire(key, 60);
    }
    if (count > 30) {
      // Exceeded limit
      return next(new Error('Too many socket connections – rate limit exceeded'));
    }
    next();
  } catch (err) {
    // Fail open on error
    console.error('Socket rate limiter error', err);
    next();
  }
};

export {};
