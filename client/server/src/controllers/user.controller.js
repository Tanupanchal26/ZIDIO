const User        = require('../models/User.model');
const ApiResponse = require('../utils/ApiResponse');
const ApiError    = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger      = require('../utils/logger');

// Fields a user is allowed to update on their own profile
const ALLOWED_UPDATE_FIELDS = ['name', 'avatar'];

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  // Whitelist — prevent mass assignment
  const updates = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (!Object.keys(updates).length) throw ApiError.badRequest('No valid fields to update');

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).lean();

  ApiResponse.ok(res, user, 'Profile updated');
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  logger.warn(`[SECURITY] Account deleted — userId: ${req.user._id}`);
  ApiResponse.noContent(res);
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().lean();
  ApiResponse.ok(res, users);
});
