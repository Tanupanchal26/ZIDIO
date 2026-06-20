const router = require('express').Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, scopeTenant } = require('../middleware/auth.middleware');

router.use(authenticate, scopeTenant('tenantId'));

router.get('/dashboard', analyticsController.getDashboard);
router.get('/', analyticsController.getAnalyticsData);

module.exports = router;
