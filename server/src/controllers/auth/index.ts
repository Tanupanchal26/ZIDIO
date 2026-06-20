// @ts-nocheck
const authService  = require('../../services/auth.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');
const { setRefreshCookie, clearRefreshCookie } = require('../../services/jwt.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract refresh token from HTTP-only cookie OR request body (mobile clients) */
const getRefreshToken = (req) =>
  req.cookies?.refreshToken || req.body?.refreshToken;

/** Sanitise user object for API responses */
const userPayload = (user) => ({
  id:         user._id,
  name:       user.name,
  email:      user.email,
  role:       user.role,
  avatar:     user.avatar,
  isVerified: user.isVerified,
  status:     user.status,
  lastLogin:  user.lastLogin,
});

// ── POST /auth/signup ─────────────────────────────────────────────────────────
exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const { user, accessToken, refreshToken } = await authService.signup({
    name, email, password, role,
  });

  setRefreshCookie(res, refreshToken);

  return ApiResponse.created(res, {
    user:        userPayload(user),
    accessToken,
  }, 'Account created. Please verify your email.');
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({ email, password });

  setRefreshCookie(res, refreshToken);

  return ApiResponse.ok(res, {
    user:        userPayload(user),
    accessToken,
  }, 'Login successful');
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = getRefreshToken(req);
  await authService.logout(req.user.id, rawRefreshToken);

  clearRefreshCookie(res);
  return ApiResponse.ok(res, null, 'Logged out successfully');
});

// ── POST /auth/logout-all ─────────────────────────────────────────────────────
exports.logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  clearRefreshCookie(res);
  return ApiResponse.ok(res, null, 'All sessions terminated');
});

// ── POST /auth/refresh-token ──────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
  const rawToken = getRefreshToken(req);
  const { user, accessToken, refreshToken } = await authService.refreshTokens(rawToken);

  setRefreshCookie(res, refreshToken);  // rotate cookie

  return ApiResponse.ok(res, {
    user:        userPayload(user),
    accessToken,
  }, 'Token refreshed');
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  // Always 200 — never reveal whether email exists
  return ApiResponse.ok(res, null,
    'If an account with that email exists, a reset link has been sent.');
});

// ── POST /auth/reset-password/:token ─────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  return ApiResponse.ok(res, null,
    'Password reset successful. Please log in with your new password.');
});

// ── GET /auth/verify-email/:token ─────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.params.token);
  return ApiResponse.ok(res, null, 'Email verified successfully');
});

// ── POST /auth/change-password ────────────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  return ApiResponse.ok(res, null,
    'Password changed successfully. All other sessions have been terminated.');
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, userPayload(req.user), 'Profile retrieved')
);


export {};
