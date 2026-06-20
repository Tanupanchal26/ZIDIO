const router      = require('express').Router();
const ctrl        = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate    = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const V           = require('../validators/auth.validator');

// ── Public routes (rate limited) ───────────────────────────────────────────────

router.post('/signup',
  authLimiter,
  validate(V.signup),
  ctrl.signup
);

router.post('/login',
  authLimiter,
  validate(V.login),
  ctrl.login
);

router.post('/forgot-password',
  authLimiter,
  validate(V.forgotPassword),
  ctrl.forgotPassword
);

router.post('/reset-password/:token',
  authLimiter,
  validate(V.resetPassword),
  ctrl.resetPassword
);

router.get('/verify-email/:token',
  validate(V.verifyEmail),
  ctrl.verifyEmail
);

// Refresh token — reads from HTTP-only cookie or body
router.post('/refresh-token',
  validate(V.refreshToken),
  ctrl.refreshToken
);

// ── Protected routes (require valid access token) ─────────────────────────────

router.use(authenticate);

router.get('/me',              ctrl.getMe);
router.post('/logout',         ctrl.logout);
router.post('/logout-all',     ctrl.logoutAll);
router.post('/change-password',
  validate(V.changePassword),
  ctrl.changePassword
);

module.exports = router;
