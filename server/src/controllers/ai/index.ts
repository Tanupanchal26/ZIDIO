// @ts-nocheck
const asyncHandler         = require('../../utils/asyncHandler');
const ApiResponse          = require('../../utils/ApiResponse');
const ApiError             = require('../../utils/ApiError');
const AIResult             = require('../../models/AIResult');
const Task                 = require('../../models/Task');
const Meeting              = require('../../models/Meeting');
const { summarize }        = require('../../ai/summarizer');
const { transcribe }       = require('../../ai/transcription');
const { extractActionItems } = require('../../ai/actionItems');
const { generateMinutes }  = require('../../ai/minutesGenerator');
const { chat, generateTasks: genTasks } = require('../../ai/assistant');
const { semanticSearch }   = require('../../ai/semanticSearch');

const MAX_TRANSCRIPT  = 50000;
const MAX_PROMPT      = 2000;

// GET /ai/:meetingId
exports.getAIResult = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meetingId: req.params.meetingId });
  if (!result) throw ApiError.notFound('AI result not found');
  return ApiResponse.ok(res, result, 'AI result retrieved');
});

// POST /ai/:meetingId/summary
exports.generateSummary = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  if (transcript.length > MAX_TRANSCRIPT) throw ApiError.badRequest(`transcript exceeds ${MAX_TRANSCRIPT} character limit`);
  const summary = await summarize(transcript);
  await AIResult.findOneAndUpdate(
    { meetingId: req.params.meetingId },
    { summary, meetingId: req.params.meetingId },
    { upsert: true, new: true }
  );
  return ApiResponse.ok(res, { summary }, 'Summary generated');
});

// GET /ai/:meetingId/transcript
exports.getTranscript = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meetingId: req.params.meetingId });
  return ApiResponse.ok(res, { transcript: result?.transcript || '' }, 'Transcript retrieved');
});

// POST /ai/:meetingId/transcript
exports.saveTranscript = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  if (transcript.length > MAX_TRANSCRIPT) throw ApiError.badRequest(`transcript exceeds ${MAX_TRANSCRIPT} character limit`);
  await AIResult.findOneAndUpdate(
    { meetingId: req.params.meetingId },
    { transcript, meetingId: req.params.meetingId },
    { upsert: true, new: true }
  );
  return ApiResponse.ok(res, null, 'Transcript saved');
});

// GET /ai/:meetingId/action-items
exports.getActionItems = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meetingId: req.params.meetingId });
  if (!result?.transcript) throw ApiError.badRequest('No transcript found for this meeting');
  const actionItems = await extractActionItems(result.transcript);
  return ApiResponse.ok(res, { actionItems }, 'Action items extracted');
});

// POST /ai/:meetingId/minutes
exports.generateMinutes = asyncHandler(async (req, res) => {
  const { transcript, title, participants, date } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  if (transcript.length > MAX_TRANSCRIPT) throw ApiError.badRequest(`transcript exceeds ${MAX_TRANSCRIPT} character limit`);
  const minutes = await generateMinutes({ transcript, title: title || 'Meeting', participants: participants || [], date: date || new Date().toISOString() });
  return ApiResponse.ok(res, { minutes }, 'Minutes generated');
});

// POST /ai/:meetingId/assistant
exports.assistantChat = asyncHandler(async (req, res) => {
  const { message, context } = req.body;
  if (!message) throw ApiError.badRequest('message is required');
  if (message.length > MAX_PROMPT) throw ApiError.badRequest(`message exceeds ${MAX_PROMPT} character limit`);
  const reply = await chat(message, context || {});
  return ApiResponse.ok(res, { reply }, 'Assistant replied');
});

// POST /ai/:meetingId/tasks
exports.generateTasks = asyncHandler(async (req, res) => {
  const { prompt, transcript } = req.body;
  if (!prompt && !transcript) throw ApiError.badRequest('prompt or transcript is required');
  if (prompt && prompt.length > MAX_PROMPT) throw ApiError.badRequest(`prompt exceeds ${MAX_PROMPT} character limit`);
  if (transcript && transcript.length > MAX_TRANSCRIPT) throw ApiError.badRequest(`transcript exceeds ${MAX_TRANSCRIPT} character limit`);
  const tasks = await genTasks(prompt || '', transcript || '');
  return ApiResponse.ok(res, { tasks }, 'Tasks generated');
});

// POST /ai/:meetingId/extract-tasks
exports.extractAndSaveTasks = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  if (transcript.length > MAX_TRANSCRIPT) throw ApiError.badRequest(`transcript exceeds ${MAX_TRANSCRIPT} character limit`);
  const actionItems = await extractActionItems(transcript);
  const tasks = await Task.insertMany(
    actionItems.map((item) => ({
      title:     item.text || item,
      meetingId: req.params.meetingId,
      tenantId:  req.user?.tenantId,
      createdBy: req.user?.id,
      priority:  item.priority || 'medium',
    }))
  );
  return ApiResponse.ok(res, { tasks }, 'Tasks extracted and saved');
});

// GET /ai/search
exports.searchMeetings = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw ApiError.badRequest('query param q is required');
  if (String(q).length > 500) throw ApiError.badRequest('query too long');
  const meetings = await Meeting.find({ tenantId: req.user?.tenantId })
    .select('title transcript summary')
    .lean();
  const docs = meetings.map((m) => ({ id: m._id, title: m.title || '', content: m.transcript || m.summary || '' }));
  const results = await semanticSearch(String(q), docs);
  return ApiResponse.ok(res, { results }, 'Search complete');
});

export {};


// GET /ai/:meetingId
exports.getAIResult = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meetingId: req.params.meetingId });
  if (!result) throw ApiError.notFound('AI result not found');
  return ApiResponse.ok(res, result, 'AI result retrieved');
});

// POST /ai/:meetingId/summary
exports.generateSummary = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  const summary = await summarize(transcript);
  await AIResult.findOneAndUpdate(
    { meetingId: req.params.meetingId },
    { summary, meetingId: req.params.meetingId },
    { upsert: true, new: true }
  );
  return ApiResponse.ok(res, { summary }, 'Summary generated');
});

// GET /ai/:meetingId/transcript
exports.getTranscript = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meetingId: req.params.meetingId });
  return ApiResponse.ok(res, { transcript: result?.transcript || '' }, 'Transcript retrieved');
});

// POST /ai/:meetingId/transcript
exports.saveTranscript = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  await AIResult.findOneAndUpdate(
    { meetingId: req.params.meetingId },
    { transcript, meetingId: req.params.meetingId },
    { upsert: true, new: true }
  );
  return ApiResponse.ok(res, null, 'Transcript saved');
});

// GET /ai/:meetingId/action-items
exports.getActionItems = asyncHandler(async (req, res) => {
  const result = await AIResult.findOne({ meetingId: req.params.meetingId });
  if (!result?.transcript) throw ApiError.badRequest('No transcript found for this meeting');
  const actionItems = await extractActionItems(result.transcript);
  return ApiResponse.ok(res, { actionItems }, 'Action items extracted');
});

// POST /ai/:meetingId/minutes
exports.generateMinutes = asyncHandler(async (req, res) => {
  const { transcript, title, participants, date } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  const minutes = await generateMinutes({ transcript, title: title || 'Meeting', participants: participants || [], date: date || new Date().toISOString() });
  return ApiResponse.ok(res, { minutes }, 'Minutes generated');
});

// POST /ai/:meetingId/assistant
exports.assistantChat = asyncHandler(async (req, res) => {
  const { message, context } = req.body;
  if (!message) throw ApiError.badRequest('message is required');
  const reply = await chat(message, context || {});
  return ApiResponse.ok(res, { reply }, 'Assistant replied');
});

// POST /ai/:meetingId/tasks
exports.generateTasks = asyncHandler(async (req, res) => {
  const { prompt, transcript } = req.body;
  if (!prompt && !transcript) throw ApiError.badRequest('prompt or transcript is required');
  const tasks = await genTasks(prompt || '', transcript || '');
  return ApiResponse.ok(res, { tasks }, 'Tasks generated');
});

// POST /ai/:meetingId/extract-tasks
exports.extractAndSaveTasks = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) throw ApiError.badRequest('transcript is required');
  const actionItems = await extractActionItems(transcript);
  const tasks = await Task.insertMany(
    actionItems.map((item) => ({
      title:     item.text || item,
      meetingId: req.params.meetingId,
      tenantId:  req.user?.tenantId,
      createdBy: req.user?.id,
      priority:  item.priority || 'medium',
    }))
  );
  return ApiResponse.ok(res, { tasks }, 'Tasks extracted and saved');
});

// GET /ai/search
exports.searchMeetings = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw ApiError.badRequest('query param q is required');
  const meetings = await Meeting.find({ tenantId: req.user?.tenantId })
    .select('title transcript summary')
    .lean();
  const docs = meetings.map((m) => ({ id: m._id, title: m.title || '', content: m.transcript || m.summary || '' }));
  const results = await semanticSearch(String(q), docs);
  return ApiResponse.ok(res, { results }, 'Search complete');
});

export {};
