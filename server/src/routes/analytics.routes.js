const router = require('express').Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, scopeTenant, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants');

router.use(authenticate, scopeTenant('tenantId'), authorize(ROLES.ADMIN));

router.get('/dashboard', analyticsController.getDashboard);
router.get('/', analyticsController.getAnalyticsData);

module.exports = router;
