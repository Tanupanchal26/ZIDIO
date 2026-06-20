// @ts-nocheck
const crypto = require('crypto');
const BaseRepository = require('./base.repository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() { super(User); }

  // ── Auth queries ───────────────────────────────────────────────────────────

  /** Full user with password + lockout fields for login flow */
  findByEmailForAuth(email) {
    return User.findOne({ email })
      .select('+password +loginAttempts +lockUntil +refreshTokens');
  }

  /** Find user by email (no password) */
  findByEmail(email) {
    return User.findOne({ email });
  }

  /** Find by hashed password-reset token that hasn't expired */
  findByResetToken(rawToken) {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    return User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +passwordChangedAt +refreshTokens');
  }

  /** Find by hashed email-verify token that hasn't expired */
  findByVerifyToken(rawToken) {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    return User.findOne({
      emailVerifyToken:   hashed,
      emailVerifyExpires: { $gt: Date.now() },
    }).select('+emailVerifyToken +emailVerifyExpires');
  }

  /** Find user by id with password (change-password flow) */
  findByIdWithPassword(id) {
    return User.findById(id).select('+password +refreshTokens +passwordChangedAt');
  }

  // ── Refresh token management ───────────────────────────────────────────────

  /** Store a hashed refresh token (rotation: one token per session) */
  addRefreshToken(userId, hashedToken) {
    return User.findByIdAndUpdate(userId, {
      $push: { refreshTokens: hashedToken },
    });
  }

  /** Remove a specific hashed refresh token (logout single session) */
  removeRefreshToken(userId, hashedToken) {
    return User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: hashedToken },
    });
  }

  /** Remove all refresh tokens (logout all sessions) */
  clearAllRefreshTokens(userId) {
    return User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  /** Find user and verify a hashed token exists in their refresh token list */
  async findByRefreshToken(hashedToken) {
    return User.findOne({ refreshTokens: hashedToken })
      .select('+refreshTokens');
  }

  // ── Profile update ─────────────────────────────────────────────────────────

  updateLastLogin(userId) {
    return User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }
}

module.exports = new UserRepository();

export {};
