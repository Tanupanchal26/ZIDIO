const router = require('express').Router();
const recordingController = require('../controllers/recording.controller');
const { authenticate, scopeTenant } = require('../middleware/auth.middleware');

router.use(authenticate, scopeTenant('tenantId'));

router.get('/', recordingController.listRecordings);
router.post('/start', recordingController.startRecording);
router.post('/:id/stop', recordingController.stopRecording);

module.exports = router;
