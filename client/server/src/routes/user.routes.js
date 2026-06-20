const router     = require('express').Router();
const ctrl       = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate   = require('../middleware/validate.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const V          = require('../validators/user.validator');

router.use(protect);

router.get('/me',    ctrl.getProfile);
router.put('/me',    uploadLimiter, validate(V.updateProfile), ctrl.updateProfile);
router.delete('/me', ctrl.deleteAccount);
router.get('/',      authorize('admin', 'super_admin'), ctrl.getAllUsers);

module.exports = router;
