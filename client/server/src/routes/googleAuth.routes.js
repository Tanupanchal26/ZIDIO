const router   = require('express').Router();
const passport = require('../config/passport');
const ctrl     = require('../controllers/googleAuth.controller');
const config   = require('../config/env');
const { authLimiter } = require('../middleware/rateLimit.middleware');

// Step 1 — send user to Google account chooser
router.get('/',
  authLimiter,
  passport.authenticate('google', {
    scope:  ['profile', 'email'],
    prompt: 'select_account',
  })
);

// Step 2 — Google sends user back here
router.get('/callback',
  passport.authenticate('google', {
    session:         true,
    failureRedirect: `${config.clientUrl}/login?error=google_failed`,
  }),
  ctrl.googleCallback
);

module.exports = router;
