import type { NextFunction, Request, Response } from 'express';

const authService = require('../../services/auth.service') as {
  signup: (payload: { name: string; email: string; password: string; role?: string }) => Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }>;
  login: (payload: { email: string; password: string }) => Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }>;
  logout: (userId: string, refreshToken?: string) => Promise<void>;
  logoutAll: (userId: string) => Promise<void>;
  refreshTokens: (refreshToken: string) => Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
  unlockAccount: (id: string) => Promise<void>;
};
const asyncHandler = require('../../utils/asyncHandler').default as (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => void;
const ApiResponse = require('../../utils/ApiResponse').default;
const logger = require('../../shared/utils/logger').default;
const { addToBlacklist } = require('../../utils/redisBlacklist') as { addToBlacklist: (token: string) => Promise<void> };

const getRefreshToken = (req: Request): string | undefined =>
  (req.cookies?.refreshToken as string | undefined) || (req.body as { refreshToken?: string } | undefined)?.refreshToken;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const setRefreshCookie = (res: Response, token: string): Response =>
  res.cookie('refreshToken', token, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

const clearRefreshCookie = (res: Response): Response =>
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

const userPayload = (user: Record<string, unknown>) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isVerified: user.isVerified,
  status: user.status,
  lastLogin: user.lastLogin,
  tenantId: user.tenantId,
});

exports.signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as { name?: string; email?: string; password?: string; role?: string };
  const { user, accessToken, refreshToken } = await authService.signup({
    name: name ?? '', email: email ?? '', password: password ?? '', role,
  });

  setRefreshCookie(res, refreshToken);

  return ApiResponse.created(res, {
    user: userPayload(user),
    accessToken,
  }, 'Account created. Please verify your email.');
});

exports.login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const { user, accessToken, refreshToken } = await authService.login({ email: email ?? '', password: password ?? '' });

  setRefreshCookie(res, refreshToken);

  return ApiResponse.ok(res, {
    user: userPayload(user),
    accessToken,
  }, 'Login successful');
});

exports.logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = getRefreshToken(req);
  const accessToken = req.headers.authorization?.split(' ')[1] || req.headers['x-access-token'] || req.query.token;
  if (accessToken) await addToBlacklist(String(accessToken));
  if (rawRefreshToken) await addToBlacklist(rawRefreshToken);
  await authService.logout(String(req.user?._id ?? ''), rawRefreshToken);

  clearRefreshCookie(res);
  return ApiResponse.ok(res, null, 'Logged out successfully');
});

exports.logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(String(req.user?._id ?? ''));
  clearRefreshCookie(res);
  return ApiResponse.ok(res, null, 'All sessions terminated');
});

exports.refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = getRefreshToken(req);
  if (!rawToken) {
    logger.info('Refresh failed: Missing refresh token');
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }
  const { user, accessToken, refreshToken } = await authService.refreshTokens(rawToken);

  setRefreshCookie(res, refreshToken);

  return ApiResponse.ok(res, {
    user: userPayload(user),
    accessToken,
  }, 'Token refreshed');
});

exports.forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword((req.body as { email?: string } | undefined)?.email ?? '');
  return ApiResponse.ok(res, null, 'If an account with that email exists, a reset link has been sent.');
});

exports.resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  await authService.resetPassword(token, (req.body as { password?: string } | undefined)?.password ?? '');
  return ApiResponse.ok(res, null, 'Password reset successful. Please log in with your new password.');
});

exports.verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  await authService.verifyEmail(token);
  return ApiResponse.ok(res, null, 'Email verified successfully');
});

exports.changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  await authService.changePassword(String(req.user?._id ?? ''), currentPassword ?? '', newPassword ?? '');
  return ApiResponse.ok(res, null, 'Password changed successfully. All other sessions have been terminated.');
});

exports.getMe = asyncHandler(async (req: Request, res: Response) =>
  ApiResponse.ok(res, userPayload((req.user ?? {}) as Record<string, unknown>), 'Profile retrieved')
);

exports.unlockAccount = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await authService.unlockAccount(id);
  return ApiResponse.ok(res, null, 'Account unlocked successfully');
});

export {};
