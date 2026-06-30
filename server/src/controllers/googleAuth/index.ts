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

    const url = new URL(`${clientUrl}/auth/google/success`);
    url.searchParams.set('id',         String(user._id));
    url.searchParams.set('name',       user.name       || '');
    url.searchParams.set('email',      user.email      || '');
    url.searchParams.set('avatar',     user.avatar     || '');
    url.searchParams.set('role',       user.role       || 'member');
    url.searchParams.set('isVerified', String(!!user.isVerified));

    return res.redirect(url.toString());
  } catch (err) {
    console.error('[Google OAuth] callback error:', err.message);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google sign-in failed.')}`);
  }
};

export {};
