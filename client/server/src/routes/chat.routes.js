const router     = require('express').Router();
const ctrl       = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');
const validate   = require('../middleware/validate.middleware');
const V          = require('../validators/chat.validator');

router.use(protect);

router.get('/:meetingId',    validate(V.getMessages),   ctrl.getMessages);
router.post('/:meetingId',   validate(V.sendMessage),   ctrl.sendMessage);
router.delete('/:messageId', validate(V.deleteMessage), ctrl.deleteMessage);

module.exports = router;
