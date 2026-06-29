// @ts-nocheck
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { jwt: jwtCfg, isProd, clientUrl } = require('../config/env');
const { AUTH } = require('../constants');
// Refresh token model for persisted storage
const RefreshToken = require('../models/refreshToken.model').default;

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
const generateRefreshToken = async (userId) => {
  const token = jwt.sign({ id: userId }, jwtCfg.refreshSecret, {
    expiresIn: jwtCfg.refreshExpiresIn,  // '7d'
    issuer:    'intellmeet',
    audience:  'intellmeet-client',
  });
  // Compute expiration date (7 days = 7 * 24 * 60 * 60 * 1000 ms)
  const ttlMs = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const hashed = hashToken(token);
  await RefreshToken.create({ tokenHash: hashed, userId, expiresAt });
  return token;
};

// ── Token verification ────────────────────────────────────────────────────────

const verifyAccessToken = (token) =>
  jwt.verify(token, jwtCfg.secret, {
    issuer:   'intellmeet',
    audience: 'intellmeet-client',
  });

/**
 * Verify a refresh token and ensure it exists in the DB (hash match).
 */
const verifyRefreshToken = async (token) => {
  const payload = jwt.verify(token, jwtCfg.refreshSecret, {
    issuer:   'intellmeet',
    audience: 'intellmeet-client',
  });
  const hashed = hashToken(token);
  const record = await RefreshToken.findOne({ tokenHash: hashed, userId: payload.id });
  if (!record) throw new Error('Refresh token not found or revoked');
  return payload;
};

// Note: verifyRefreshToken is async and defined above to include DB check.

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
    path:     '/',       // must be '/' so cookie is sent to all auth routes
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
const generateTokenPair = async (user) => {
  const accessToken  = generateAccessToken({ id: user._id, role: user.role, email: user.email });
  const refreshToken = await generateRefreshToken(user._id);
  return { accessToken, refreshToken };
};

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
