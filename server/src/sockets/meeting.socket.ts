// @ts-nocheck
const MeetingNote = require('../models/MeetingNote');
const Meeting     = require('../models/Meeting');
const AIResult    = require('../models/AIResult');
const aiService   = require('../services/ai.service');
const logger      = require('../utils/logger');

module.exports = (io, socket) => {
  // ── Join / Leave ───────────────────────────────────────────────────────────
  socket.on('meeting:join', async (roomId) => {
    socket.join(`meeting:${roomId}`);
    // Also join the chat room for this meeting
    socket.join(`chat:${roomId}`);

    socket.to(`meeting:${roomId}`).emit('meeting:user-joined', {
      socketId: socket.id,
      user: { id: socket.user.id, name: socket.user.name, avatar: socket.user.avatar },
    });

    const room = io.sockets.adapter.rooms.get(`meeting:${roomId}`);
    const participants = [];
    if (room) {
      for (const sid of room) {
        const s = io.sockets.sockets.get(sid);
        if (s?.user) {
          participants.push({
            id: s.user.id,
            name: s.user.name,
            avatar: s.user.avatar,
            socketId: sid,
            isHost: false,
            isMuted: false,
            isVideoOff: true,
          });
        }
      }
    }
    io.to(`meeting:${roomId}`).emit('meeting:participant-count', room?.size || 0);
    io.to(`meeting:${roomId}`).emit('meeting:participants-list', participants);
  });

  socket.on('meeting:signal', ({ roomId, signal, to }) => {
    io.to(to).emit('meeting:signal', { signal, from: socket.id });
  });

  socket.on('meeting:leave', (roomId) => {
    socket.leave(`meeting:${roomId}`);
    socket.leave(`chat:${roomId}`);
    socket.to(`meeting:${roomId}`).emit('meeting:user-left', {
      socketId: socket.id,
      userId:   socket.user.id,
    });
    const room = io.sockets.adapter.rooms.get(`meeting:${roomId}`);
    io.to(`meeting:${roomId}`).emit('meeting:participant-count', room?.size || 0);
  });

  // ── Media state ────────────────────────────────────────────────────────────
  socket.on('meeting:media-state', ({ roomId, isMuted, isVideoOff, isScreenSharing }) => {
    socket.to(`meeting:${roomId}`).emit('meeting:media-state', {
      userId: socket.user.id,
      socketId: socket.id,
      isMuted,
      isVideoOff,
      isScreenSharing,
    });
  });

  // ── Screen Share state ─────────────────────────────────────────────────────
  socket.on('meeting:screen-share', ({ roomId, isSharing }) => {
    io.to(`meeting:${roomId}`).emit('meeting:screen-share', {
      userId: socket.user.id,
      socketId: socket.id,
      name: socket.user.name,
      isSharing,
    });
  });

  // ── Recording state broadcast ──────────────────────────────────────────────
  socket.on('recording:started', ({ roomId }) => {
    io.to(`meeting:${roomId}`).emit('recording:started', {
      userId: socket.user.id,
      name: socket.user.name,
    });
  });

  socket.on('recording:stopped', ({ roomId }) => {
    io.to(`meeting:${roomId}`).emit('recording:stopped', {
      userId: socket.user.id,
      name: socket.user.name,
    });
  });

  // ── Raise hand ─────────────────────────────────────────────────────────────
  socket.on('meeting:raise-hand', ({ roomId, raised }) => {
    io.to(`meeting:${roomId}`).emit('meeting:raise-hand', {
      userId: socket.user.id,
      name:   socket.user.name,
      raised,
    });
  });

  // ── Live Notes (collaborative) ─────────────────────────────────────────────
  socket.on('notes:join',  (meetingId) => socket.join(`notes:${meetingId}`));
  socket.on('notes:leave', (meetingId) => socket.leave(`notes:${meetingId}`));

  socket.on('notes:update', async ({ meetingId, content }) => {
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
  });

  socket.on('notes:cursor', ({ meetingId, position }) => {
    socket.to(`notes:${meetingId}`).emit('notes:cursor', {
      userId:   socket.user.id,
      name:     socket.user.name,
      position,
    });
  });

  // ── Transcript chunk (client-side speech recognition) ────────────────────
  socket.on('meeting:transcript-chunk', async ({ meetingId, chunk }) => {
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
      chunk,
      speaker: socket.user.name,
      userId:  socket.user.id,
    });
  });

  // ── Meeting ended — trigger AI pipeline ──────────────────────────────────
  socket.on('meeting:ended', async ({ meetingId }) => {
    try {
      await Meeting.findByIdAndUpdate(meetingId, { status: 'ended', endedAt: new Date() });

      // Emit progress so UI can show loading state
      io.to(`meeting:${meetingId}`).emit('ai:processing', { step: 'summary' });

      const [summary, actionItems] = await Promise.all([
        aiService.summarize(meetingId),
        aiService.getActionItems(meetingId),
      ]);

      io.to(`meeting:${meetingId}`).emit('ai:summary-ready', { summary, actionItems });
    } catch (err) {
      logger.error(`[SOCKET] meeting:ended AI error: ${err.message}`);
      io.to(`meeting:${meetingId}`).emit('ai:error', { message: 'Failed to generate summary' });
    }
  });

  // ── AI Assistant via socket (in-meeting) ─────────────────────────────────
  socket.on('ai:assistant-message', async ({ meetingId, message, history }) => {
    if (!message?.trim()) return;
    try {
      const reply = await aiService.assistantChat(meetingId, message, history || []);
      socket.emit('ai:assistant-reply', { reply });
    } catch (err) {
      logger.error(`[SOCKET] ai:assistant error: ${err.message}`);
      socket.emit('ai:assistant-reply', { reply: 'Sorry, I encountered an error. Please try again.' });
    }
  });

  // ── AI: request minutes generation ───────────────────────────────────────
  socket.on('ai:generate-minutes', async ({ meetingId }) => {
    try {
      const minutes = await aiService.generateMeetingMinutes(meetingId);
      socket.emit('ai:minutes-ready', { minutes });
    } catch (err) {
      socket.emit('ai:error', { message: 'Failed to generate meeting minutes' });
    }
  });
};

export {};
