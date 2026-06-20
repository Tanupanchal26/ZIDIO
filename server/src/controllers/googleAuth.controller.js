const googleAuthService = require('../services/googleAuth.service');
const { isProd, clientUrl } = require('../config/env');
const { AUTH } = require('../constants');

exports.googleCallback = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await googleAuthService.googleLogin(req.user);

    // HTTP-only cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isProd,
      sameSite: 'lax',
      maxAge:   AUTH.COOKIE_MAX_AGE,
      path:     '/',
    });

    // Pass everything in URL so frontend needs NO extra API call
    const url = new URL(`${clientUrl}/auth/google/success`);
    url.searchParams.set('token',      accessToken);
    url.searchParams.set('id',         String(user._id));
    url.searchParams.set('name',       user.name       || '');
    url.searchParams.set('email',      user.email      || '');
    url.searchParams.set('avatar',     user.avatar     || '');
    url.searchParams.set('role',       user.role       || 'employee');
    url.searchParams.set('isVerified', String(!!user.isVerified));

    return res.redirect(url.toString());
  } catch (err) {
    console.error('[Google OAuth] callback error:', err.message);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google sign-in failed.')}`);
  }
};
