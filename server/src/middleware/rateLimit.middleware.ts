// @ts-nocheck
const rateLimit = require('express-rate-limit');
const { HTTP } = require('../constants');

const handler = (req, res) =>
  res.status(HTTP.TOO_MANY_REQUESTS).json({
    success: false,
    statusCode: HTTP.TOO_MANY_REQUESTS,
    message: 'Too many requests — please slow down.',
    requestId: res.locals?.requestId,
  });

// ── General API limiter — 100 req / 15 min per IP ────────────────────────────
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              100,
  standardHeaders:  true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders:    false,
  handler,
});

// ── Auth limiter — 10 req / 15 min (brute-force protection) ─────────────────
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler,
  skipSuccessfulRequests: true, // only count failed attempts
});

// ── AI endpoints — 20 req / min (cost control) ──────────────────────────────
const aiLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler,
});

module.exports = { apiLimiter, authLimiter, aiLimiter };

export {};
