// @ts-nocheck
const User = require('../../models/User');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true }).select('-password');
  res.json(user);
};

exports.deleteAccount = async (req, res) => {
  await User.findByIdAndDelete(req.user.id);
  res.json({ message: 'Account deleted' });
};

exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

export {};
