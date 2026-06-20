const router      = require('express').Router();
const ctrl        = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate    = require('../middleware/validate.middleware');
const { authLimiter, refreshLimiter, otpLimiter } = require('../middleware/rateLimit.middleware');
const V           = require('../validators/auth.validator');

// ── Public routes ──────────────────────────────────────────────────────────────

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
  otpLimiter,
  validate(V.verifyEmail),
  ctrl.verifyEmail
);

router.post('/refresh-token',
  refreshLimiter,
  validate(V.refreshToken),
  ctrl.refreshToken
);

// ── Protected routes ───────────────────────────────────────────────────────────

router.use(authenticate);

router.get('/me',              ctrl.getMe);
router.post('/logout',         ctrl.logout);
router.post('/logout-all',     ctrl.logoutAll);
router.post('/change-password',
  validate(V.changePassword),
  ctrl.changePassword
);

module.exports = router;
