// @ts-nocheck
const User    = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger   = require('../common/logger').default;
const { getRedisClient } = require('../config/redis');

const CACHE_TTL = 300; // 5 minutes

const invalidateUserCache = async (userId) => {
  const redis = getRedisClient();
  if (redis) await redis.del(`user:${userId}`).catch(() => {});
};

/** Retrieve a user's profile by ID */
async function getProfile(userId) {
  const redis    = getRedisClient();
  const cacheKey = `user:${userId}`;

  if (redis) {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    logger.warn(`User not found: ${userId}`);
    throw ApiError.notFound('User not found');
  }

  if (redis) await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(user)).catch(() => {});
  return user;
}

/** Retrieve user with password and auth fields for token verification */
async function getUserForAuth(userId) {
  const user = await User.findById(userId)
    .select('+password +loginAttempts +lockUntil +refreshTokens');
  if (!user) {
    logger.warn(`User not found for auth: ${userId}`);
    throw ApiError.unauthorized('User not found');
  }
  return user;
}

/** Update a user's profile */
async function updateProfile(userId, updateData) {
  const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
  if (!user) {
    logger.warn(`User not found for update: ${userId}`);
    throw ApiError.notFound('User not found');
  }
  await invalidateUserCache(userId);
  return user;
}

/** Delete a user's account */
async function deleteAccount(userId) {
  const result = await User.findByIdAndDelete(userId);
  if (!result) {
    logger.warn(`User not found for deletion: ${userId}`);
    throw ApiError.notFound('User not found');
  }
  await invalidateUserCache(userId);
}

/** Admin: retrieve all users */
async function getAllUsers() {
  const users = await User.find().select('-password');
  return users;
}

module.exports = {
  getProfile,
  getUserForAuth,
  updateProfile,
  deleteAccount,
  getAllUsers,
};

export {};
