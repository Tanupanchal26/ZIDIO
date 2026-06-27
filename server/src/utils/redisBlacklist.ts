// @ts-nocheck
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');

/**
 * Add a JWT to the blacklist with TTL equal to its remaining lifetime.
 * @param {string} token - raw JWT string.
 */
async function addToBlacklist(token) {
  const payload = jwt.decode(token);
  if (!payload || !payload.exp) return; // cannot determine TTL
  const ttlMs = payload.exp * 1000 - Date.now();
  if (ttlMs <= 0) return;
  const client = getRedisClient();
  if (!client) return;
  const key = `blacklist:${token}`;
  await client.set(key, 'revoked', { PX: ttlMs });
}

/**
 * Check if a JWT is blacklisted.
 * @param {string} token - raw JWT string.
 * @returns {Promise<boolean>}
 */
async function isBlacklisted(token) {
  const client = getRedisClient();
  if (!client) return false;
  const key = `blacklist:${token}`;
  const result = await client.get(key);
  return result === 'revoked';
}

module.exports = { addToBlacklist, isBlacklisted };

export {};
