const router = require('express').Router();
const exportController = require('../controllers/export.controller');
const { authenticate, scopeTenant } = require('../middleware/auth.middleware');

router.use(authenticate, scopeTenant('tenantId'));

router.get('/:id/pdf', exportController.exportPDF);
router.get('/:id/csv', exportController.exportCSV);

module.exports = router;
