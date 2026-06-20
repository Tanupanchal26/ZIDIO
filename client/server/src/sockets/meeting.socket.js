const MeetingNote = require('../models/MeetingNote.model');
const Meeting     = require('../models/Meeting.model');
const AIResult    = require('../models/AIResult.model');
const aiService   = require('../services/ai.service');
const logger      = require('../utils/logger');

const wrap = (fn) => async (...args) => {
  try { await fn(...args); }
  catch (err) { logger.error(`[SOCKET:meeting] ${err.message}`); }
};

module.exports = (io, socket) => {
  socket.on('meeting:join', wrap(async (roomId) => {
    socket.join(`meeting:${roomId}`);
    socket.to(`meeting:${roomId}`).emit('meeting:user-joined', {
      socketId: socket.id,
      user: { id: socket.user.id, name: socket.user.name, avatar: socket.user.avatar },
    });
    const room = io.sockets.adapter.rooms.get(`meeting:${roomId}`);
    io.to(`meeting:${roomId}`).emit('meeting:participant-count', room?.size || 0);
  }));

  socket.on('meeting:signal', ({ roomId, signal, to }) => {
    io.to(to).emit('meeting:signal', { signal, from: socket.id });
  });

  socket.on('meeting:leave', (roomId) => {
    socket.leave(`meeting:${roomId}`);
    socket.to(`meeting:${roomId}`).emit('meeting:user-left', {
      socketId: socket.id, userId: socket.user.id,
    });
    const room = io.sockets.adapter.rooms.get(`meeting:${roomId}`);
    io.to(`meeting:${roomId}`).emit('meeting:participant-count', room?.size || 0);
  });

  socket.on('meeting:media-state', ({ roomId, isMuted, isVideoOff, isScreenSharing }) => {
    socket.to(`meeting:${roomId}`).emit('meeting:media-state', {
      userId: socket.user.id, socketId: socket.id, isMuted, isVideoOff, isScreenSharing,
    });
  });

  socket.on('meeting:raise-hand', ({ roomId, raised }) => {
    io.to(`meeting:${roomId}`).emit('meeting:raise-hand', {
      userId: socket.user.id, name: socket.user.name, raised,
    });
  });

  socket.on('notes:join',  (meetingId) => socket.join(`notes:${meetingId}`));
  socket.on('notes:leave', (meetingId) => socket.leave(`notes:${meetingId}`));

  socket.on('notes:update', wrap(async ({ meetingId, content }) => {
    if (!socket.user?.id || content == null) return;
    await MeetingNote.findOneAndUpdate(
      { meeting: meetingId },
      {
        meeting:      meetingId,
        tenantId:     socket.user.tenantId,
        createdBy:    socket.user.id,
        content,
        lastEditedBy: socket.user.id,
      },
      { upsert: true, new: true }
    );
    socket.to(`notes:${meetingId}`).emit('notes:update', {
      content,
      editedBy: { id: socket.user.id, name: socket.user.name },
    });
  }));

  socket.on('notes:cursor', ({ meetingId, position }) => {
    socket.to(`notes:${meetingId}`).emit('notes:cursor', {
      userId: socket.user.id, name: socket.user.name, position,
    });
  });

  socket.on('meeting:transcript-chunk', wrap(async ({ meetingId, chunk }) => {
    if (!chunk?.trim()) return;
    await AIResult.findOneAndUpdate(
      { meeting: meetingId },
      {
        $setOnInsert: { meeting: meetingId },
        $push: { transcriptChunks: { text: chunk, speaker: socket.user.name, ts: Date.now() } },
      },
      { upsert: true }
    );
    io.to(`meeting:${meetingId}`).emit('meeting:transcript-chunk', {
      chunk, speaker: socket.user.name, userId: socket.user.id,
    });
  }));

  socket.on('meeting:ended', wrap(async ({ meetingId }) => {
    await Meeting.findOneAndUpdate(
      { roomId: meetingId },
      { status: 'ended', endedAt: new Date() }
    );
    io.to(`meeting:${meetingId}`).emit('ai:processing', { step: 'summary' });

    const [summary, actionItems] = await Promise.all([
      aiService.summarize(meetingId),
      aiService.getActionItems(meetingId),
    ]);
    io.to(`meeting:${meetingId}`).emit('ai:summary-ready', { summary, actionItems });
  }));

  socket.on('ai:assistant-message', wrap(async ({ meetingId, message, history }) => {
    if (!message?.trim()) return;
    const reply = await aiService.assistantChat(meetingId, message, history || []);
    socket.emit('ai:assistant-reply', { reply });
  }));

  socket.on('ai:generate-minutes', wrap(async ({ meetingId }) => {
    const minutes = await aiService.generateMeetingMinutes(meetingId);
    socket.emit('ai:minutes-ready', { minutes });
  }));
};
