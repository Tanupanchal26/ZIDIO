// @ts-nocheck
const userRepo    = require('../repositories/user.repository');
const teamRepo    = require('../repositories/team.repository');
const channelRepo = require('../repositories/channel.repository');
const Tenant      = require('../models/Tenant');
const jwtService  = require('./jwt.service');
const emailService = require('./email.service');
const ApiError    = require('../utils/ApiError');
const { USER_STATUS, AUTH } = require('../constants');

// Generic "invalid credentials" message — never reveal whether email exists
const CRED_ERROR = 'Invalid email or password';

// ── 1. Signup ─────────────────────────────────────────────────────────────────
const signup = async ({ name, email, password, role }) => {
  const exists = await userRepo.findByEmail(email);
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const slugify = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const tenant = await Tenant.create({
    name:   `${name}'s Workspace`,
    slug:   `${slugify(name)}-${Date.now()}`,
    plan:   'free',
  });

  const user = await userRepo.create({ name, email, password, role, tenantId: tenant._id });

  const team = await teamRepo.create({
    tenantId: tenant._id,
    name:      'General',
    slug:      'general',
    createdBy: user._id,
    members:   [{ user: user._id, role: 'owner' }],
  });

  await channelRepo.create({
    tenantId: tenant._id,
    team:      team._id,
    name:      'general',
    slug:      'general',
    type:      'public',
    isDefault: true,
    createdBy: user._id,
    members:   [user._id],
  });

  const rawToken = user.createToken('emailVerify');
  await user.save({ validateBeforeSave: false });

  emailService.sendVerificationEmail(user, rawToken).catch(() => {});

  const { accessToken, refreshToken } = jwtService.generateTokenPair(user);
  const hashedRefresh = jwtService.hashToken(refreshToken);
  await userRepo.addRefreshToken(user._id, hashedRefresh);

  return { user, accessToken, refreshToken };
};

// ── 2. Login ──────────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  // +password +loginAttempts +lockUntil
  const user = await userRepo.findByEmailForAuth(email);

  // Constant-time response — don't reveal "email not found"
  if (!user) throw ApiError.unauthorized(CRED_ERROR);

  // Account status checks
  if (user.status === USER_STATUS.BANNED)
    throw ApiError.forbidden('Your account has been suspended. Contact support.');

  if (user.status === USER_STATUS.INACTIVE)
    throw ApiError.forbidden('Your account is inactive.');

  // Lockout check
  if (user.isLocked) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.forbidden(
      `Account temporarily locked. Try again in ${minutesLeft} minute(s).`
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    await user.incLoginAttempts();
    const remaining = AUTH.MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1);
    const msg = remaining > 0
      ? `${CRED_ERROR}. ${remaining} attempt(s) remaining.`
      : `Account locked for ${AUTH.LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`;
    throw ApiError.unauthorized(msg);
  }

  // Successful login — reset counter
  await user.resetLoginAttempts();

  const { accessToken, refreshToken } = jwtService.generateTokenPair(user);
  const hashedRefresh = jwtService.hashToken(refreshToken);
  await userRepo.addRefreshToken(user._id, hashedRefresh);

  return { user, accessToken, refreshToken };
};

// ── 3. Logout ─────────────────────────────────────────────────────────────────
const logout = async (userId, rawRefreshToken) => {
  if (rawRefreshToken) {
    const hashed = jwtService.hashToken(rawRefreshToken);
    await userRepo.removeRefreshToken(userId, hashed);
  }
};

// ── 4. Logout all sessions ────────────────────────────────────────────────────
const logoutAll = async (userId) => {
  await userRepo.clearAllRefreshTokens(userId);
};

// ── 5. Refresh Token (with rotation) ─────────────────────────────────────────
const refreshTokens = async (rawRefreshToken) => {
  if (!rawRefreshToken) throw ApiError.unauthorized('Refresh token required');

  // Verify signature first (throws if expired/invalid)
  let decoded;
  try {
    decoded = jwtService.verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const hashedIncoming = jwtService.hashToken(rawRefreshToken);
  const user = await userRepo.findByRefreshToken(hashedIncoming);

  if (!user) {
    // Token reuse detected — possible refresh token theft
    // Nuclear option: revoke ALL sessions for this user
    await userRepo.clearAllRefreshTokens(decoded.id);
    throw ApiError.unauthorized('Token reuse detected — all sessions revoked');
  }

  // Rotation: remove old token, issue new pair
  await userRepo.removeRefreshToken(user._id, hashedIncoming);
  const { accessToken, refreshToken: newRefresh } = jwtService.generateTokenPair(user);
  const hashedNew = jwtService.hashToken(newRefresh);
  await userRepo.addRefreshToken(user._id, hashedNew);

  return { user, accessToken, refreshToken: newRefresh };
};

// ── 6. Forgot Password ────────────────────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email);
  // Always respond with success — never reveal whether email exists
  if (!user) return;

  const rawToken = user.createToken('passwordReset');
  await user.save({ validateBeforeSave: false });

  await emailService.sendPasswordResetEmail(user, rawToken).catch(() => {});
};

// ── 7. Reset Password ─────────────────────────────────────────────────────────
const resetPassword = async (rawToken, newPassword) => {
  const user = await userRepo.findByResetToken(rawToken);
  if (!user) throw ApiError.badRequest('Invalid or expired password reset token');

  user.password             = newPassword; // pre-save hook hashes it
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  // refreshTokens cleared by pre-save hook on password change
  await user.save();

  return user;
};

// ── 8. Verify Email ───────────────────────────────────────────────────────────
const verifyEmail = async (rawToken) => {
  const user = await userRepo.findByVerifyToken(rawToken);
  if (!user) throw ApiError.badRequest('Invalid or expired verification token');

  user.isVerified        = true;
  user.emailVerifyToken   = undefined;
  user.emailVerifyExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return user;
};

// ── 9. Change Password ────────────────────────────────────────────────────────
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await userRepo.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.unauthorized('Current password is incorrect');

  user.password = newPassword; // pre-save hook hashes + clears refresh tokens
  await user.save();

  return user;
};

module.exports = {
  signup,
  login,
  logout,
  logoutAll,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
};

export {};
