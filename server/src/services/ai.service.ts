// @ts-nocheck
const AIResult  = require('../models/AIResult');
const Meeting   = require('../models/Meeting');
const { summarize }          = require('../ai/summarizer');
const { extractActionItems } = require('../ai/actionItems');
const { generateMinutes }    = require('../ai/minutesGenerator');
const { chat, generateTasks } = require('../ai/assistant');
const { semanticSearch }     = require('../ai/semanticSearch');
const { getRedisClient }     = require('../config/redis');
const { CACHE_TTL }          = require('../constants');
const logger = require('../utils/logger');

// ── Cache helpers ─────────────────────────────────────────────────────────────
const cacheGet = async (key) => {
  const r = getRedisClient();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

const cacheSet = async (key, data, ttl = CACHE_TTL.AI_SUMMARY) => {
  const r = getRedisClient();
  if (!r) return;
  try { await r.setEx(key, ttl, JSON.stringify(data)); } catch {}
};

const cacheDel = async (...keys) => {
  const r = getRedisClient();
  if (!r) return;
  try { await Promise.all(keys.map(k => r.del(k))); } catch {}
};

// ── Transcript ────────────────────────────────────────────────────────────────
exports.saveTranscript = async (meetingId, transcript) => {
  await AIResult.findOneAndUpdate(
    { meeting: meetingId },
    { meeting: meetingId, transcript },
    { upsert: true, new: true }
  );
  await cacheDel(`ai:summary:${meetingId}`, `ai:minutes:${meetingId}`);
};

// Build full transcript text from chunks if raw string is empty
const resolveTranscript = async (meetingId) => {
  const result = await AIResult.findOne({ meeting: meetingId });
  if (!result) return '';
  if (result.transcript?.trim()) return result.transcript;
  // fallback: concatenate chunks
  return (result.transcriptChunks || []).map(c => `${c.speaker}: ${c.text}`).join('\n');
};

// ── Summarize ─────────────────────────────────────────────────────────────────
exports.summarize = async (meetingId) => {
  const cacheKey = `ai:summary:${meetingId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const transcript = await resolveTranscript(meetingId);
  if (!transcript) return '';

  const [summary, actionItems] = await Promise.all([
    summarize(transcript),
    extractActionItems(transcript),
  ]);

  await AIResult.findOneAndUpdate(
    { meeting: meetingId },
    { summary, actionItems },
    { upsert: true }
  );
  await Meeting.findByIdAndUpdate(meetingId, { summary });
  await cacheSet(cacheKey, summary);
  return summary;
};

// ── Action Items ──────────────────────────────────────────────────────────────
exports.getActionItems = async (meetingId) => {
  const result = await AIResult.findOne({ meeting: meetingId });
  if (result?.actionItems?.length) return result.actionItems;

  const transcript = await resolveTranscript(meetingId);
  if (!transcript) return [];

  const actionItems = await extractActionItems(transcript);
  await AIResult.findOneAndUpdate({ meeting: meetingId }, { actionItems }, { upsert: true });
  return actionItems;
};

// ── Meeting Minutes ───────────────────────────────────────────────────────────
exports.generateMeetingMinutes = async (meetingId) => {
  const cacheKey = `ai:minutes:${meetingId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [meeting, transcript] = await Promise.all([
    Meeting.findById(meetingId).populate('participants', 'name'),
    resolveTranscript(meetingId),
  ]);

  if (!meeting) throw new Error('Meeting not found');
  if (!transcript) return '';

  const minutes = await generateMinutes({
    transcript,
    title:        meeting.title,
    participants: meeting.participants.map(p => p.name),
    date:         (meeting.startedAt || meeting.createdAt).toLocaleDateString(),
  });

  await AIResult.findOneAndUpdate({ meeting: meetingId }, { minutes }, { upsert: true });
  await cacheSet(cacheKey, minutes);
  return minutes;
};

// ── AI Assistant ──────────────────────────────────────────────────────────────
exports.assistantChat = async (meetingId, userMessage, history = []) => {
  const [aiResult, allMeetings] = await Promise.all([
    AIResult.findOne({ meeting: meetingId }),
    Meeting.find({}).select('title').limit(20).lean(),
  ]);

  const transcript = aiResult?.transcript ||
    (aiResult?.transcriptChunks || []).map(c => `${c.speaker}: ${c.text}`).join('\n');

  return chat(userMessage, {
    transcript,
    summary:       aiResult?.summary || '',
    history,
    meetingTitles: allMeetings.map(m => m.title),
  });
};

// ── Generate Tasks ────────────────────────────────────────────────────────────
exports.generateTasksFromMeeting = async (meetingId, prompt = '') => {
  const transcript = await resolveTranscript(meetingId);
  return generateTasks(prompt || 'Extract all tasks from this meeting', transcript);
};

// ── Semantic Search ───────────────────────────────────────────────────────────
exports.searchMeetings = async (tenantId, query) => {
  const meetings = await Meeting.find({ tenantId })
    .select('title transcript summary createdAt')
    .limit(50)
    .lean();

  const documents = meetings
    .filter(m => m.summary || m.transcript)
    .map(m => ({
      id:      m._id.toString(),
      title:   m.title,
      content: m.summary || m.transcript?.slice(0, 1000) || '',
      date:    m.createdAt,
    }));

  if (!documents.length) return [];

  const results = await semanticSearch(query, documents);
  return results.map(r => ({ id: r.id, title: r.title, date: r.date, score: r.score }));
};

export {};
