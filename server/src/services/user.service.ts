// eslint-disable-next-line @typescript-eslint/no-require-imports
const User = require('../models/User');
import ApiError from '../utils/ApiError';
import logger from '../shared/utils/logger';
import { getRedisClient } from '../config/redis';
import { CACHE_TTL, REDIS_KEYS } from '../constants';
import type { Document } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserDoc = Document & Record<string, any>;

const USER_CACHE_TTL = CACHE_TTL.USER_SESSION;

const invalidateUserCache = async (userId: string): Promise<void> => {
  const redis = getRedisClient();
  if (redis) await redis.del(REDIS_KEYS.USER_CACHE(userId)).catch(() => undefined);
};

export const getProfile = async (userId: string): Promise<UserDoc> => {
  const redis    = getRedisClient();
  const cacheKey = REDIS_KEYS.USER_CACHE(userId);

  if (redis) {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached) as UserDoc;
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    logger.warn(`User not found: ${userId}`);
    throw ApiError.notFound('User not found');
  }

  if (redis) {
    await redis.setEx(cacheKey, USER_CACHE_TTL, JSON.stringify(user)).catch(() => undefined);
  }
  return user as UserDoc;
};

export const getUserForAuth = async (userId: string): Promise<UserDoc> => {
  const user = await User.findById(userId)
    .select('+password +loginAttempts +lockUntil +refreshTokens +passwordChangedAt');
  if (!user) {
    logger.warn(`User not found for auth: ${userId}`);
    throw ApiError.unauthorized('User not found');
  }
  return user as UserDoc;
};

export const updateProfile = async (userId: string, updateData: Record<string, unknown>): Promise<UserDoc> => {
  const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
  if (!user) {
    logger.warn(`User not found for update: ${userId}`);
    throw ApiError.notFound('User not found');
  }
  await invalidateUserCache(userId);
  return user as UserDoc;
};

export const deleteAccount = async (userId: string): Promise<void> => {
  const result = await User.findByIdAndDelete(userId);
  if (!result) {
    logger.warn(`User not found for deletion: ${userId}`);
    throw ApiError.notFound('User not found');
  }
  await invalidateUserCache(userId);
};

export const getAllUsers = async (): Promise<UserDoc[]> =>
  User.find().select('-password') as Promise<UserDoc[]>;

export default {
  getProfile,
  getUserForAuth,
  updateProfile,
  deleteAccount,
  getAllUsers,
};
