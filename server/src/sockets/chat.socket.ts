// @ts-nocheck
const Message            = require('../models/Message');
const Channel            = require('../models/Channel');
const { getRedisClient } = require('../config/redis');

const CHANNEL_CACHE_TTL = 60; // seconds

const getChannel = async (channelId) => {
  const redis = getRedisClient();
  const key   = `channel:meta:${channelId}`;

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit);
    } catch {}
  }

  const channel = await Channel.findById(channelId).lean();
  if (channel && redis) {
    try { await redis.setEx(key, CHANNEL_CACHE_TTL, JSON.stringify(channel)); } catch {}
  }
  return channel;
};

module.exports = (io, socket) => {
  // ── Meeting chat ───────────────────────────────────────────────────────────
  socket.on('chat:join', (meetingId) => socket.join(`chat:${meetingId}`));

  socket.on('chat:message', async ({ meetingId, content }) => {
    if (!socket.user?.id || !content?.trim()) return;
    try {
      const message = await Message.create({
        meeting: meetingId,
        sender:  socket.user.id,
        content,
        type: 'text',
      });
      const populated = await message.populate('sender', 'name avatar');
      io.to(`chat:${meetingId}`).emit('chat:message', populated);
    } catch {
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  socket.on('chat:typing', ({ meetingId, isTyping }) => {
    if (!socket.user?.id) return;
    socket.to(`chat:${meetingId}`).emit('chat:typing', {
      userId: socket.user.id,
      name:   socket.user.name,
      isTyping,
    });
  });

  socket.on('chat:leave', (meetingId) => socket.leave(`chat:${meetingId}`));

  // ── Channel chat ───────────────────────────────────────────────────────────
  socket.on('channel:join', (channelId) => socket.join(`channel:${channelId}`));

  socket.on('channel:message', async ({ channelId, content, mentions = [], attachments = [] }) => {
    if (!socket.user?.id || !content?.trim()) return;
    try {
      const channel = await getChannel(channelId);
      if (!channel) return;

      const [message] = await Promise.all([
        Message.create({
          tenantId: channel.tenantId,
          channel:  channelId,
          sender:   socket.user.id,
          content,
          mentions,
          attachments,
          type: attachments.length ? 'file' : 'text',
        }),
        Channel.findByIdAndUpdate(channelId, { lastMessageAt: new Date() }),
      ]);

      const populated = await message.populate('sender', 'name avatar');
      io.to(`channel:${channelId}`).emit('channel:message', populated);
      socket.emit('channel:delivery', { messageId: message._id.toString(), state: 'sent' });
    } catch {
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  socket.on('channel:typing', ({ channelId, isTyping }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:typing', {
      userId: socket.user.id,
      name:   socket.user.name,
      isTyping,
    });
  });

  socket.on('channel:read', ({ channelId, messageId }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:read', { userId: socket.user.id, messageId });
  });

  socket.on('channel:delivered', ({ channelId, messageId }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:delivery', { messageId, state: 'delivered' });
  });

  socket.on('channel:leave', (channelId) => socket.leave(`channel:${channelId}`));

  // ── Message edit ───────────────────────────────────────────────────────────
  socket.on('chat:edit', async ({ messageId, content, channelId, meetingId }) => {
    if (!socket.user?.id || !content?.trim()) return;
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, sender: socket.user.id },
      { content, isEdited: true, editedAt: new Date() },
      { new: true }
    ).populate('sender', 'name avatar');
    if (!msg) return;
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:edited', msg);
  });

  // ── Message delete ─────────────────────────────────────────────────────────
  socket.on('chat:delete', async ({ messageId, channelId, meetingId }) => {
    if (!socket.user?.id) return;
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, sender: socket.user.id },
      { isDeleted: true, content: '[Message deleted]' },
      { new: true }
    );
    if (!msg) return;
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:deleted', { messageId });
  });

  // ── Thread reply ───────────────────────────────────────────────────────────
  socket.on('chat:reply', async ({ parentId, channelId, meetingId, content }) => {
    if (!socket.user?.id || !content?.trim() || !parentId) return;
    const [message] = await Promise.all([
      Message.create({
        channel:  channelId  || null,
        meeting:  meetingId  || null,
        parentId,
        sender:   socket.user.id,
        content,
        type: 'text',
      }),
      Message.findByIdAndUpdate(parentId, { $inc: { threadCount: 1 } }),
    ]);
    const populated = await message.populate('sender', 'name avatar');
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:reply', populated);
  });

  // ── Reaction — atomic $addToSet / $pull instead of full document save ──────
  socket.on('chat:react', async ({ messageId, emoji, channelId, meetingId }) => {
    if (!socket.user?.id) return;

    // Try to pull first (toggle off); if nothing was pulled, push (toggle on)
    const pulled = await Message.findOneAndUpdate(
      { _id: messageId, 'reactions.emoji': emoji, 'reactions.users': socket.user.id },
      { $pull: { 'reactions.$.users': socket.user.id } },
      { new: true }
    );

    const updated = pulled ?? await Message.findOneAndUpdate(
      { _id: messageId, 'reactions.emoji': emoji },
      { $addToSet: { 'reactions.$.users': socket.user.id } },
      { new: true }
    ) ?? await Message.findOneAndUpdate(
      { _id: messageId },
      { $push: { reactions: { emoji, users: [socket.user.id] } } },
      { new: true }
    );

    if (!updated) return;
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:reaction', { messageId, reactions: updated.reactions });
  });
};

export {};
