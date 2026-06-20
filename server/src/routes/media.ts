// @ts-nocheck
const router = require('express').Router();
const ctrl = require('../controllers/media');
const { authenticate, scopeTenant } = require('../middleware/auth.middleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate, scopeTenant('tenantId'));

router.post('/upload', upload.single('file'), ctrl.upload);
router.get('/', ctrl.list);
router.delete('/:id', ctrl.delete);

module.exports = router;

export {};
