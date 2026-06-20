const { getMessages, sendMessage, deleteMessage } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');
const router = require('express').Router();

router.use(protect);
router.get('/:meetingId', getMessages);
router.post('/:meetingId', sendMessage);
router.delete('/:messageId', deleteMessage);

module.exports = router;
