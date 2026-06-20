// @ts-nocheck
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { jwt: jwtCfg, isProd, clientUrl } = require('../config/env');
const { AUTH } = require('../constants');

// ── Token generation ──────────────────────────────────────────────────────────

/**
 * Access token — short-lived (15 min), carries user identity + role.
 * Signed with JWT_SECRET.
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, jwtCfg.secret, {
    expiresIn: jwtCfg.expiresIn,   // '15m'
    issuer:    'intellmeet',
    audience:  'intellmeet-client',
  });

/**
 * Refresh token — long-lived (7 days), carries only userId.
 * Signed with a DIFFERENT secret (JWT_REFRESH_SECRET).
 * A SHA-256 hash of this token is stored in the DB for rotation.
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, jwtCfg.refreshSecret, {
    expiresIn: jwtCfg.refreshExpiresIn,  // '7d'
    issuer:    'intellmeet',
    audience:  'intellmeet-client',
  });

// ── Token verification ────────────────────────────────────────────────────────

const verifyAccessToken = (token) =>
  jwt.verify(token, jwtCfg.secret, {
    issuer:   'intellmeet',
    audience: 'intellmeet-client',
  });

const verifyRefreshToken = (token) =>
  jwt.verify(token, jwtCfg.refreshSecret, {
    issuer:   'intellmeet',
    audience: 'intellmeet-client',
  });

// ── Hash helpers ──────────────────────────────────────────────────────────────

/** Hash a refresh token for safe DB storage */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ── Cookie helpers ─────────────────────────────────────────────────────────────

/**
 * Set refresh token as an HTTP-only, Secure, SameSite=Strict cookie.
 * JS on the client can NEVER read this cookie.
 */
const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   isProd,               // HTTPS only in production
    sameSite: isProd ? 'strict' : 'lax',
    maxAge:   AUTH.COOKIE_MAX_AGE,  // 7 days in ms
    path:     '/api/v1/auth',       // restrict cookie scope to auth routes
  });
};

/** Clear the refresh token cookie on logout */
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path:     '/api/v1/auth',
  });
};

// ── Token pair helper ─────────────────────────────────────────────────────────

/**
 * Generate both tokens in one call.
 * Returns { accessToken, refreshToken }.
 * Call setRefreshCookie() separately — keeps this pure.
 */
const generateTokenPair = (user) => ({
  accessToken:  generateAccessToken({ id: user._id, role: user.role, email: user.email }),
  refreshToken: generateRefreshToken(user._id),
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
};

export {};
