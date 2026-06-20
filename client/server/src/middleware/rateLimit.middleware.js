const rateLimit = require('express-rate-limit');
const { HTTP } = require('../constants');

const handler = (req, res) =>
  res.status(HTTP.TOO_MANY_REQUESTS).json({
    success:    false,
    statusCode: HTTP.TOO_MANY_REQUESTS,
    message:    'Too many requests — please slow down.',
    requestId:  res.locals?.requestId,
  });

// ── General API limiter — 100 req / 15 min per IP ────────────────────────────
const apiLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

// ── Auth (login / signup / password reset) — 10 req / 15 min ─────────────────
const authLimiter = rateLimit({
  windowMs:               15 * 60 * 1000,
  max:                    10,
  standardHeaders:        true,
  legacyHeaders:          false,
  handler,
  skipSuccessfulRequests: true,
});

// ── Refresh token — 30 req / 15 min (prevents token churning) ────────────────
const refreshLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

// ── OTP / verify-email — 5 req / hour ────────────────────────────────────────
const otpLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

// ── Upload endpoints — 20 req / hour ─────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

// ── AI endpoints — 20 req / min (cost control) ───────────────────────────────
const aiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

module.exports = { apiLimiter, authLimiter, refreshLimiter, otpLimiter, uploadLimiter, aiLimiter };
