// @ts-nocheck
const jwtService = require('./jwt.service');
const userRepo   = require('../repositories/user.repository');

const googleLogin = async (user) => {
  const { accessToken, refreshToken } = await jwtService.generateTokenPair(user);
  const hashedRefresh = jwtService.hashToken(refreshToken);
  await userRepo.addRefreshToken(user._id, hashedRefresh);
  await userRepo.updateLastLogin(user._id);
  return { user, accessToken, refreshToken };
};

module.exports = { googleLogin };

export {};
