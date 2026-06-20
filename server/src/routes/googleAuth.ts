// @ts-nocheck
const router   = require('express').Router();
const passport = require('../config/passport');
const ctrl     = require('../controllers/googleAuth');

// Step 1 — send user to Google account chooser
router.get('/',
  passport.authenticate('google', {
    scope:  ['profile', 'email'],
    prompt: 'select_account',     // always show account chooser
  })
);

// Step 2 — Google sends user back here
router.get('/callback',
  passport.authenticate('google', {
    session:         true,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  ctrl.googleCallback
);

module.exports = router;

export {};
