// @ts-nocheck
const googleAuthService = require('../../services/googleAuth.service');
const { isProd, clientUrl } = require('../../config/env');
const { AUTH } = require('../../constants');

exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google sign-in failed — no user session.')}`);
    }
    const { user, accessToken, refreshToken } = await googleAuthService.googleLogin(req.user);

    // HTTP-only cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isProd,
      sameSite: 'lax',
      maxAge:   AUTH.COOKIE_MAX_AGE,
      path:     '/',
    });

    // Store token in a short-lived http-only cookie instead of URL param
    // Frontend reads it once and clears it
    res.cookie('__oauth_token', accessToken, {
      httpOnly: false,   // frontend JS must read it once
      secure:   isProd,
      sameSite: 'lax',
      maxAge:   60 * 1000, // 60 seconds — one-time use
      path:     '/',
    });

    // User data is fetched client-side via /auth/me after reading the token cookie
    return res.redirect(`${clientUrl}/auth/google/success`);
  } catch (err) {
    const logger = require('../../shared/utils/logger').default;
    logger.error('[Google OAuth] callback error', { message: err.message });
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google sign-in failed.')}`);
  }
};

export {};
