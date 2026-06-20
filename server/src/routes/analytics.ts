// @ts-nocheck
const router = require('express').Router();
const analyticsController = require('../controllers/analytics');
const { authenticate, scopeTenant, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants');

router.use(authenticate, scopeTenant('tenantId'));

router.get('/dashboard', analyticsController.getDashboard);
router.get('/', authorize(ROLES.ADMIN), analyticsController.getAnalyticsData);

module.exports = router;

export {};
