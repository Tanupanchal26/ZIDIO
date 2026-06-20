const AIResult  = require('../models/AIResult.model');
const aiService = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError  = require('../utils/ApiError');

// GET /ai/:meetingId
exports.getAIResult = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meeting: req.params.meetingId });
  if (!result) return res.status(404).json({ message: 'No AI result found' });
  res.json(result);
});

// POST /ai/:meetingId/summary
exports.generateSummary = asyncHandler(async (req, res) => {
  const summary = await aiService.summarize(req.params.meetingId);
  res.json({ summary });
});

// GET /ai/:meetingId/transcript
exports.getTranscript = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meeting: req.params.meetingId });
  res.json({ transcript: result?.transcript || '' });
});

// POST /ai/:meetingId/transcript
exports.saveTranscript = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  await aiService.saveTranscript(req.params.meetingId, transcript);
  res.json({ message: 'Transcript saved' });
});

// GET /ai/:meetingId/action-items
exports.getActionItems = asyncHandler(async (req, res) => {
  const actionItems = await aiService.getActionItems(req.params.meetingId);
  res.json({ actionItems });
});

// POST /ai/:meetingId/minutes
exports.generateMinutes = asyncHandler(async (req, res) => {
  const minutes = await aiService.generateMeetingMinutes(req.params.meetingId);
  res.json({ minutes });
});

// POST /ai/:meetingId/assistant
exports.assistantChat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) throw ApiError.badRequest('message is required');
  const reply = await aiService.assistantChat(req.params.meetingId, message, history);
  res.json({ reply });
});

// POST /ai/:meetingId/tasks
exports.generateTasks = asyncHandler(async (req, res) => {
  const { prompt = '' } = req.body;
  const tasks = await aiService.generateTasksFromMeeting(req.params.meetingId, prompt);
  res.json({ tasks });
});

// GET /ai/search?q=...
exports.searchMeetings = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) throw ApiError.badRequest('Query parameter q is required');
  const results = await aiService.searchMeetings(req.user.tenantId, q);
  res.json({ results });
});

// POST /ai/:meetingId/extract-tasks — Extract action items and save as Task documents
exports.extractAndSaveTasks = asyncHandler(async (req, res) => {
  const Task = require('../models/Task.model');
  const actionItems = await aiService.getActionItems(req.params.meetingId);
  
  if (!actionItems || actionItems.length === 0) {
    return res.json({ tasks: [], message: 'No action items found to extract' });
  }

  const tasks = [];
  for (const item of actionItems) {
    const task = await Task.create({
      tenantId: req.tenantId || req.user.tenantId,
      meeting: req.params.meetingId,
      createdBy: req.user._id,
      title: item.text,
      description: `Auto-extracted from meeting by AI`,
      priority: item.priority || 'medium',
      status: 'todo',
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
    });
    tasks.push(task);
  }

  res.status(201).json({ tasks, message: `${tasks.length} tasks created from action items` });
});
