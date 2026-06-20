const router = require('express').Router();
const recordingController = require('../controllers/recording.controller');
const { authenticate, scopeTenant } = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate, scopeTenant('tenantId'));

router.get('/', recordingController.listRecordings);
router.get('/:id', recordingController.getRecording);
router.post('/upload', upload.single('video'), recordingController.uploadRecording);
router.post('/start', recordingController.startRecording);
router.post('/:id/stop', recordingController.stopRecording);
router.delete('/:id', recordingController.deleteRecording);

module.exports = router;
