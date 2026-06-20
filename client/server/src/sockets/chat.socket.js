const Message = require('../models/Message.model');
const Channel = require('../models/Channel.model');
const logger  = require('../utils/logger');

const wrap = (fn) => async (...args) => {
  try { await fn(...args); }
  catch (err) { logger.error(`[SOCKET:chat] ${err.message}`); }
};

module.exports = (io, socket) => {
  socket.on('chat:join',  (meetingId) => socket.join(`chat:${meetingId}`));
  socket.on('chat:leave', (meetingId) => socket.leave(`chat:${meetingId}`));

  socket.on('chat:message', wrap(async ({ meetingId, content }) => {
    if (!socket.user?.id || !content?.trim()) return;
    const message = await Message.create({
      meeting: meetingId, sender: socket.user.id,
      content: content.trim(), type: 'text',
    });
    const populated = await message.populate('sender', 'name avatar');
    io.to(`chat:${meetingId}`).emit('chat:message', populated);
  }));

  socket.on('chat:typing', ({ meetingId, isTyping }) => {
    if (!socket.user?.id) return;
    socket.to(`chat:${meetingId}`).emit('chat:typing', {
      userId: socket.user.id, name: socket.user.name, isTyping,
    });
  });

  socket.on('channel:join',  (channelId) => socket.join(`channel:${channelId}`));
  socket.on('channel:leave', (channelId) => socket.leave(`channel:${channelId}`));

  socket.on('channel:message', wrap(async ({ channelId, content, mentions = [], attachments = [] }) => {
    if (!socket.user?.id || !content?.trim()) return;
    const channel = await Channel.findById(channelId).lean();
    if (!channel) return;

    const message = await Message.create({
      tenantId: channel.tenantId, channel: channelId,
      sender: socket.user.id, content: content.trim(),
      mentions, attachments,
      type: attachments.length ? 'file' : 'text',
    });
    await Channel.findByIdAndUpdate(channelId, { lastMessageAt: new Date() });
    const populated = await message.populate('sender', 'name avatar');
    io.to(`channel:${channelId}`).emit('channel:message', populated);
    socket.emit('channel:delivery', { messageId: message._id.toString(), state: 'sent' });
  }));

  socket.on('channel:typing', ({ channelId, isTyping }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:typing', {
      userId: socket.user.id, name: socket.user.name, isTyping,
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

  socket.on('chat:edit', wrap(async ({ messageId, content, channelId, meetingId }) => {
    if (!socket.user?.id || !content?.trim()) return;
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, sender: socket.user.id },
      { content: content.trim(), isEdited: true, editedAt: new Date() },
      { new: true }
    ).populate('sender', 'name avatar');
    if (!msg) return;
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:edited', msg);
  }));

  socket.on('chat:delete', wrap(async ({ messageId, channelId, meetingId }) => {
    if (!socket.user?.id) return;
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, sender: socket.user.id },
      { isDeleted: true, content: '[Message deleted]' },
      { new: true }
    );
    if (!msg) return;
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:deleted', { messageId });
  }));

  socket.on('chat:reply', wrap(async ({ parentId, channelId, meetingId, content }) => {
    if (!socket.user?.id || !content?.trim() || !parentId) return;
    const message = await Message.create({
      channel: channelId || null, meeting: meetingId || null,
      parentId, sender: socket.user.id, content: content.trim(), type: 'text',
    });
    await Message.findByIdAndUpdate(parentId, { $inc: { threadCount: 1 } });
    const populated = await message.populate('sender', 'name avatar');
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:reply', populated);
  }));

  socket.on('chat:react', wrap(async ({ messageId, emoji, channelId, meetingId }) => {
    if (!socket.user?.id || !emoji) return;
    const msg = await Message.findById(messageId);
    if (!msg) return;
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      const idx = existing.users.indexOf(socket.user.id);
      if (idx === -1) existing.users.push(socket.user.id);
      else            existing.users.splice(idx, 1);
    } else {
      msg.reactions.push({ emoji, users: [socket.user.id] });
    }
    await msg.save();
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:reaction', { messageId, reactions: msg.reactions });
  }));
};
