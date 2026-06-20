/**
 * Socket.IO Unit Tests — test socket event handlers in isolation
 * Strategy: stub socket/io objects, verify DB calls and emissions
 */
process.env.NODE_ENV           = 'test';
process.env.MONGO_URI          = 'mongodb://localhost:27017/intellmeet_test';
process.env.JWT_SECRET         = 'test-access-secret-minimum-32-characters!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters!';

const mongoose = require('mongoose');

// ── Mock models and services ──────────────────────────────────────────────────
jest.mock('../src/models/Message.model');
jest.mock('../src/models/Channel.model');
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const Message = require('../src/models/Message.model');
const Channel = require('../src/models/Channel.model');

// ── Socket/IO factory ─────────────────────────────────────────────────────────
const makeSocket = (overrides = {}) => ({
  user:    { id: new mongoose.Types.ObjectId().toString(), name: 'Alice', tenantId: 'tid' },
  join:    jest.fn(),
  leave:   jest.fn(),
  to:      jest.fn().mockReturnThis(),
  emit:    jest.fn(),
  on:      jest.fn(),
  ...overrides,
});

const makeIO = () => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
});

// ── Load handlers ─────────────────────────────────────────────────────────────
const chatHandler     = require('../src/sockets/chat.socket');
const presenceHandler = require('../src/sockets/presence.socket');

// ── Helpers ───────────────────────────────────────────────────────────────────
const captureHandlers = (socket) => {
  const handlers = {};
  socket.on.mockImplementation((event, fn) => { handlers[event] = fn; });
  return handlers;
};

// ─────────────────────────────────────────────────────────────────────────────
describe('chatSocket: room management', () => {
  it('chat:join registers socket in room', () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);
    h['chat:join']('meeting-123');
    expect(socket.join).toHaveBeenCalledWith('chat:meeting-123');
  });

  it('chat:leave removes socket from room', () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);
    h['chat:leave']('meeting-123');
    expect(socket.leave).toHaveBeenCalledWith('chat:meeting-123');
  });

  it('channel:join registers socket in channel room', () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);
    h['channel:join']('ch-456');
    expect(socket.join).toHaveBeenCalledWith('channel:ch-456');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('chatSocket: message sending', () => {
  beforeEach(() => jest.clearAllMocks());

  it('chat:message creates Message and broadcasts to room', async () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);

    const fakeMsg = { _id: 'msgid', content: 'hello', populate: jest.fn().mockResolvedValue({ _id: 'msgid', content: 'hello' }) };
    Message.create = jest.fn().mockResolvedValue(fakeMsg);

    await h['chat:message']({ meetingId: 'mtg1', content: 'hello' });

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
      meeting: 'mtg1', content: 'hello', type: 'text',
    }));
    expect(io.to).toHaveBeenCalledWith('chat:mtg1');
  });

  it('chat:message ignores empty content', async () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);

    Message.create = jest.fn();
    await h['chat:message']({ meetingId: 'mtg1', content: '   ' });
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('channel:message ignores missing channel', async () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);

    Channel.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    Message.create = jest.fn();
    await h['channel:message']({ channelId: 'ch1', content: 'hi' });
    expect(Message.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('chatSocket: typing indicator', () => {
  it('broadcasts typing to other room members', () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);

    h['chat:typing']({ meetingId: 'mtg2', isTyping: true });
    expect(socket.to).toHaveBeenCalledWith('chat:mtg2');
    expect(socket.emit).toHaveBeenCalledWith('chat:typing', expect.objectContaining({
      userId: socket.user.id, isTyping: true,
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('chatSocket: reactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds new reaction to message and broadcasts', async () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);

    const msg = { reactions: [], save: jest.fn().mockResolvedValue({}) };
    Message.findById = jest.fn().mockResolvedValue(msg);

    await h['chat:react']({ messageId: 'msg1', emoji: '👍', meetingId: 'mtg1' });
    expect(msg.reactions).toHaveLength(1);
    expect(msg.reactions[0].emoji).toBe('👍');
    expect(msg.save).toHaveBeenCalled();
  });

  it('toggles reaction off if user already reacted', async () => {
    const io = makeIO(); const socket = makeSocket();
    const h = captureHandlers(socket);
    chatHandler(io, socket);

    const msg = {
      reactions: [{ emoji: '👍', users: [socket.user.id] }],
      save: jest.fn().mockResolvedValue({}),
    };
    Message.findById = jest.fn().mockResolvedValue(msg);

    await h['chat:react']({ messageId: 'msg1', emoji: '👍', meetingId: 'mtg1' });
    expect(msg.reactions[0].users).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('presenceSocket', () => {
  it('registers disconnect handler', () => {
    const io = makeIO(); const socket = makeSocket();
    presenceHandler(io, socket);
    expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });
});
