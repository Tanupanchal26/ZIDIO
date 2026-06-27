// @ts-nocheck
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const logger = require('../../common/logger').default;
const userService = require('../../services/user.service');

// Get current user's profile
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  ApiResponse.ok(res, user, 'Profile retrieved');
});

// Update current user's profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  ApiResponse.ok(res, user, 'Profile updated');
});

// Delete current user's account
exports.deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id);
  ApiResponse.ok(res, null, 'Account deleted');
});

// Get all users (admin)
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  ApiResponse.ok(res, users, 'Users list retrieved');
});

export {};
