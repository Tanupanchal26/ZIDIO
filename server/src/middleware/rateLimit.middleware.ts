import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import { HTTP } from '../constants';

const rateLimitHandler = (_req: unknown, res: any) =>
  res.status(HTTP.TOO_MANY_REQUESTS).json({
    success:    false,
    statusCode: HTTP.TOO_MANY_REQUESTS,
    message:    'Too many requests — please slow down.',
    requestId:  res.locals?.requestId,
  });

const makeStore = (prefix: string) => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({ sendCommand: (...args: string[]) => (client as any).sendCommand(args), prefix });
};

/** General API limiter — 120 req / 60 s per IP (globally enforced via Redis) */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs:        60 * 1_000,
  max:             120,
  standardHeaders: true,
  legacyHeaders:   false,
  store:           makeStore('rl:api:'),
  handler:         rateLimitHandler,
});

/** Auth limiter — 10 req / 15 min (brute-force protection, globally enforced) */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs:               15 * 60 * 1_000,
  max:                    10,
  standardHeaders:        true,
  legacyHeaders:          false,
  store:                  makeStore('rl:auth:'),
  handler:                rateLimitHandler,
  skipSuccessfulRequests: true,
});

/** AI endpoints — 20 req / min (cost control, globally enforced) */
export const aiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs:        60 * 1_000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  store:           makeStore('rl:ai:'),
  handler:         rateLimitHandler,
});
