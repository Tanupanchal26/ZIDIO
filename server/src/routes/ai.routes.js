const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimit.middleware');
const {
  getAIResult,
  generateSummary,
  getTranscript,
  saveTranscript,
  getActionItems,
  generateMinutes,
  assistantChat,
  generateTasks,
  searchMeetings,
} = require('../controllers/ai.controller');

router.use(protect, aiLimiter);

// Semantic search (no meetingId)
router.get('/search', searchMeetings);

// Per-meeting routes
router.get('/:meetingId',               getAIResult);
router.post('/:meetingId/summary',      generateSummary);
router.get('/:meetingId/transcript',    getTranscript);
router.post('/:meetingId/transcript',   saveTranscript);
router.get('/:meetingId/action-items',  getActionItems);
router.post('/:meetingId/minutes',      generateMinutes);
router.post('/:meetingId/assistant',    assistantChat);
router.post('/:meetingId/tasks',        generateTasks);

module.exports = router;
