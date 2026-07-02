// @ts-nocheck
const crypto = require('crypto');
const BaseRepository = require('./base.repository');
const User = require('../models/User');
const RefreshToken = require('../models/refreshToken.model').default;

class UserRepository extends BaseRepository {
  constructor() { super(User); }

  // ── Auth queries ───────────────────────────────────────────────────────────

  /** Full user with password + lockout fields for login flow */
  findByEmailForAuth(email) {
    return User.findOne({ email })
      .select('+password +loginAttempts +lockUntil');
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
    }).select('+passwordResetToken +passwordResetExpires +passwordChangedAt');
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
    return User.findById(id).select('+password +passwordChangedAt');
  }

  // ── Refresh token management (delegates to RefreshToken collection) ─────────

  /** Store a hashed refresh token */
  addRefreshToken(userId, hashedToken) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return RefreshToken.create({ tokenHash: hashedToken, userId, expiresAt });
  }

  /** Remove a specific hashed refresh token (logout single session) */
  removeRefreshToken(_userId, hashedToken) {
    return RefreshToken.deleteOne({ tokenHash: hashedToken });
  }

  /** Remove all refresh tokens for a user (logout all sessions) */
  clearAllRefreshTokens(userId) {
    return RefreshToken.deleteMany({ userId });
  }

  /** Find user by verifying a hashed token exists in the RefreshToken collection */
  async findByRefreshToken(hashedToken) {
    const record = await RefreshToken.findOne({ tokenHash: hashedToken });
    if (!record) return null;
    return User.findById(record.userId);
  }

  // ── Profile update ─────────────────────────────────────────────────────────

  updateLastLogin(userId) {
    return User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }
}

module.exports = new UserRepository();

export {};
