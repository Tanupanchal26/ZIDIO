const AIResult    = require('../models/AIResult.model');
const aiService   = require('../services/ai.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError    = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.getAIResult = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meeting: req.params.meetingId }).lean();
  if (!result) throw ApiError.notFound('No AI result found');
  ApiResponse.ok(res, result);
});

exports.generateSummary = asyncHandler(async (req, res) => {
  const summary = await aiService.summarize(req.params.meetingId);
  ApiResponse.ok(res, { summary });
});

exports.getTranscript = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meeting: req.params.meetingId }).lean();
  ApiResponse.ok(res, { transcript: result?.transcript || '' });
});

exports.saveTranscript = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  await aiService.saveTranscript(req.params.meetingId, transcript);
  ApiResponse.ok(res, null, 'Transcript saved');
});

exports.getActionItems = asyncHandler(async (req, res) => {
  const actionItems = await aiService.getActionItems(req.params.meetingId);
  ApiResponse.ok(res, { actionItems });
});

exports.generateMinutes = asyncHandler(async (req, res) => {
  const minutes = await aiService.generateMeetingMinutes(req.params.meetingId);
  ApiResponse.ok(res, { minutes });
});

exports.assistantChat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) throw ApiError.badRequest('message is required');
  const reply = await aiService.assistantChat(req.params.meetingId, message, history);
  ApiResponse.ok(res, { reply });
});

exports.generateTasks = asyncHandler(async (req, res) => {
  const { prompt = '' } = req.body;
  const tasks = await aiService.generateTasksFromMeeting(req.params.meetingId, prompt);
  ApiResponse.ok(res, { tasks });
});

exports.searchMeetings = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) throw ApiError.badRequest('Query parameter q is required');
  const results = await aiService.searchMeetings(req.user.tenantId, q);
  ApiResponse.ok(res, { results });
});
