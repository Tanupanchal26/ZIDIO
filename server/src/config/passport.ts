// @ts-nocheck
require('dotenv').config();          // ensure env is loaded before strategy is built
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto         = require('crypto');
const User           = require('../models/User');

const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback';

console.log('[Passport] Google callbackURL:', CALLBACK_URL);   // confirm at startup

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email       = profile.emails?.[0]?.value;
      const avatar      = profile.photos?.[0]?.value || '';
      const googleId    = profile.id;
      const displayName = profile.displayName || profile.name?.givenName || 'User';

      if (!email) return done(new Error('No email from Google account'), null);

      // 1 — existing Google user
      let user = await User.findOne({ googleId });
      if (user) {
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date(), avatar: avatar || user.avatar });
        return done(null, user);
      }

      // 2 — existing email user → link Google
      user = await User.findOne({ email });
      if (user) {
        user = await User.findByIdAndUpdate(
          user._id,
          { googleId, provider: 'google', emailVerified: true, isVerified: true, avatar: user.avatar || avatar, lastLogin: new Date() },
          { new: true }
        );
        return done(null, user);
      }

      // 3 — new user
      user = await User.create({
        name: displayName, email, googleId,
        provider: 'google', avatar,
        emailVerified: true, isVerified: true,
        password: crypto.randomBytes(32).toString('hex'),
        status: 'active',
      });

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try   { done(null, await User.findById(id)); }
  catch (err) { done(err, null); }
});

module.exports = passport;

export {};
