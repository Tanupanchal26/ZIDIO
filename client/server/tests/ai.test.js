/**
 * AI Service Unit Tests
 * Covers: saveTranscript, summarize, getActionItems, assistantChat, searchMeetings
 */
process.env.NODE_ENV           = 'test';
process.env.MONGO_URI          = 'mongodb://localhost:27017/intellmeet_test';
process.env.JWT_SECRET         = 'test-access-secret-minimum-32-characters!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters!';

jest.mock('../src/models/AIResult.model');
jest.mock('../src/models/Meeting.model');
jest.mock('../src/ai/summarizer',       () => ({ summarize: jest.fn() }));
jest.mock('../src/ai/actionItems',      () => ({ extractActionItems: jest.fn() }));
jest.mock('../src/ai/minutesGenerator', () => ({ generateMinutes: jest.fn() }));
jest.mock('../src/ai/assistant',        () => ({ chat: jest.fn(), generateTasks: jest.fn() }));
jest.mock('../src/ai/semanticSearch',   () => ({ semanticSearch: jest.fn() }));
jest.mock('../src/config/redis',        () => ({ getRedisClient: jest.fn().mockReturnValue(null) }));
jest.mock('../src/utils/logger',        () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const AIResult        = require('../src/models/AIResult.model');
const Meeting         = require('../src/models/Meeting.model');
const { summarize }          = require('../src/ai/summarizer');
const { extractActionItems } = require('../src/ai/actionItems');
const { chat, generateTasks } = require('../src/ai/assistant');
const { semanticSearch }      = require('../src/ai/semanticSearch');
const aiService       = require('../src/services/ai.service');

// ─────────────────────────────────────────────────────────────────────────────
describe('aiService.saveTranscript', () => {
  it('upserts AIResult with transcript text', async () => {
    AIResult.findOneAndUpdate = jest.fn().mockResolvedValue({});
    await aiService.saveTranscript('mtg1', 'Alice: Hello World');
    expect(AIResult.findOneAndUpdate).toHaveBeenCalledWith(
      { meeting: 'mtg1' },
      { meeting: 'mtg1', transcript: 'Alice: Hello World' },
      { upsert: true, new: true }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('aiService.summarize', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls summarize() and extractActionItems() and persists result', async () => {
    AIResult.findOne = jest.fn().mockResolvedValue({ transcript: 'Alice: Hello', transcriptChunks: [] });
    AIResult.findOneAndUpdate = jest.fn().mockResolvedValue({});
    Meeting.findByIdAndUpdate  = jest.fn().mockResolvedValue({});

    summarize.mockResolvedValue('Summary text');
    extractActionItems.mockResolvedValue([{ task: 'Follow up' }]);

    const result = await aiService.summarize('mtg1');
    expect(result).toBe('Summary text');
    expect(AIResult.findOneAndUpdate).toHaveBeenCalledWith(
      { meeting: 'mtg1' },
      { summary: 'Summary text', actionItems: [{ task: 'Follow up' }] },
      { upsert: true }
    );
  });

  it('returns empty string when no transcript exists', async () => {
    AIResult.findOne = jest.fn().mockResolvedValue(null);
    const result = await aiService.summarize('mtg-empty');
    expect(result).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('aiService.getActionItems', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns cached action items from DB without calling AI', async () => {
    const items = [{ task: 'Write tests', owner: 'Alice' }];
    AIResult.findOne = jest.fn().mockResolvedValue({ actionItems: items });

    const result = await aiService.getActionItems('mtg1');
    expect(result).toEqual(items);
    expect(extractActionItems).not.toHaveBeenCalled();
  });

  it('calls AI when no cached items exist', async () => {
    AIResult.findOne = jest.fn()
      .mockResolvedValueOnce({ actionItems: [], transcript: 'John: Review PR' })
      .mockResolvedValueOnce({ actionItems: [], transcript: 'John: Review PR' });
    AIResult.findOneAndUpdate = jest.fn().mockResolvedValue({});
    extractActionItems.mockResolvedValue([{ task: 'Review PR' }]);

    const result = await aiService.getActionItems('mtg2');
    expect(extractActionItems).toHaveBeenCalled();
  });

  it('returns empty array when no transcript', async () => {
    AIResult.findOne = jest.fn().mockResolvedValue({ actionItems: [] });
    const result = await aiService.getActionItems('mtg3');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('aiService.assistantChat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes transcript and history to chat()', async () => {
    AIResult.findOne = jest.fn().mockResolvedValue({ transcript: 'Alice: Let us ship.', summary: 'Ship it.' });
    Meeting.find     = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) });
    chat.mockResolvedValue('Based on the transcript, the decision was to ship.');

    const res = await aiService.assistantChat('mtg1', 'What was decided?', []);
    expect(chat).toHaveBeenCalledWith('What was decided?', expect.objectContaining({ transcript: 'Alice: Let us ship.' }));
    expect(res).toBe('Based on the transcript, the decision was to ship.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('aiService.searchMeetings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array when no meetings have content', async () => {
    Meeting.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([
        { _id: 'id1', title: 'Empty Meeting', summary: '', transcript: '' },
      ]) }) }),
    });

    const results = await aiService.searchMeetings('tenant1', 'roadmap');
    expect(results).toEqual([]);
    expect(semanticSearch).not.toHaveBeenCalled();
  });

  it('calls semanticSearch with documents and returns formatted results', async () => {
    Meeting.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([
        { _id: 'id1', title: 'Q4 Planning', summary: 'We planned Q4', createdAt: new Date() },
      ]) }) }),
    });
    semanticSearch.mockResolvedValue([{ id: 'id1', title: 'Q4 Planning', date: new Date(), score: 0.95 }]);

    const results = await aiService.searchMeetings('tenant1', 'Q4');
    expect(semanticSearch).toHaveBeenCalled();
    expect(results[0]).toMatchObject({ id: 'id1', score: 0.95 });
  });
});
