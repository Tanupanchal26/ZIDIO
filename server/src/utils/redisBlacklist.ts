import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis';
import { REDIS_KEYS } from '../constants';

interface JwtPayload {
  exp?: number;
}

export const addToBlacklist = async (token: string): Promise<void> => {
  const payload = jwt.decode(token) as JwtPayload | null;
  if (!payload?.exp) return;

  const ttlMs = payload.exp * 1000 - Date.now();
  if (ttlMs <= 0) return;

  const client = getRedisClient();
  if (!client) return;

  await client.set(REDIS_KEYS.BLACKLIST(token), 'revoked', { PX: ttlMs });
};

export const isBlacklisted = async (token: string): Promise<boolean> => {
  const client = getRedisClient();
  // Fail closed: if Redis is unavailable, treat the token as potentially revoked
  // to prevent revoked tokens from becoming valid during an outage.
  if (!client) return true;

  const result = await client.get(REDIS_KEYS.BLACKLIST(token));
  return result === 'revoked';
};
