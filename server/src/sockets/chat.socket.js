const Message = require('../models/Message.model');
const Channel = require('../models/Channel.model');

module.exports = (io, socket) => {
  // ── Meeting chat ───────────────────────────────────────────────────────────
  socket.on('chat:join', (meetingId) => socket.join(`chat:${meetingId}`));

  socket.on('chat:message', async ({ meetingId, content }) => {
    if (!socket.user?.id || !content?.trim()) return;
    const message = await Message.create({
      meeting: meetingId,
      sender:  socket.user.id,
      content,
      type: 'text',
    });
    const populated = await message.populate('sender', 'name avatar');
    io.to(`chat:${meetingId}`).emit('chat:message', populated);
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

    const channel = await Channel.findById(channelId);
    if (!channel) return;

    const message = await Message.create({
      tenantId: channel.tenantId,
      channel:  channelId,
      sender:   socket.user.id,
      content,
      mentions,
      attachments,
      type: attachments.length ? 'file' : 'text',
    });

    await Channel.findByIdAndUpdate(channelId, { lastMessageAt: new Date() });

    const populated = await message.populate('sender', 'name avatar');
    io.to(`channel:${channelId}`).emit('channel:message', populated);
    // Confirm 'sent' to the original sender
    socket.emit('channel:delivery', { messageId: message._id.toString(), state: 'sent' });
  });

  socket.on('channel:typing', ({ channelId, isTyping }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:typing', {
      userId: socket.user.id,
      name:   socket.user.name,
      isTyping,
    });
  });

  // ── Read receipt ────────────────────────────────────────────────────────────
  socket.on('channel:read', ({ channelId, messageId }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:read', {
      userId:    socket.user.id,
      messageId,
    });
  });

  // ── Delivery ACK ────────────────────────────────────────────────────────────
  socket.on('channel:delivered', ({ channelId, messageId }) => {
    if (!socket.user?.id) return;
    socket.to(`channel:${channelId}`).emit('channel:delivery', {
      messageId,
      state: 'delivered',
    });
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
    const message = await Message.create({
      channel:  channelId  || null,
      meeting:  meetingId  || null,
      parentId,
      sender:   socket.user.id,
      content,
      type: 'text',
    });
    await Message.findByIdAndUpdate(parentId, { $inc: { threadCount: 1 } });
    const populated = await message.populate('sender', 'name avatar');
    const room = channelId ? `channel:${channelId}` : `chat:${meetingId}`;
    io.to(room).emit('chat:reply', populated);
  });

  // ── Reaction ───────────────────────────────────────────────────────────────
  socket.on('chat:react', async ({ messageId, emoji, channelId, meetingId }) => {
    if (!socket.user?.id) return;
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
  });
};
