const router = require('express').Router();
const exportController = require('../controllers/export.controller');
const { authenticate, scopeTenant } = require('../middleware/auth.middleware');

router.use(authenticate, scopeTenant('tenantId'));

router.get('/summary/:meetingId', exportController.exportSummaryPDF);
router.get('/action-items/:meetingId', exportController.exportActionItemsCSV);
router.get('/analytics', exportController.exportAnalyticsCSV);

module.exports = router;
