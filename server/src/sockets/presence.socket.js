// In-memory presence: tenantId → Set<userId>
const presenceMap = new Map();

const getOnlineUsers = (tenantId) => [...(presenceMap.get(tenantId) || [])];

module.exports = (io, socket) => {
  const { id: userId, tenantId, name, avatar } = socket.user || {};
  if (!userId || !tenantId) return;

  // Join tenant presence room
  socket.join(`presence:${tenantId}`);

  // Mark online
  if (!presenceMap.has(tenantId)) presenceMap.set(tenantId, new Set());
  presenceMap.get(tenantId).add(userId);

  // Broadcast join to tenant
  socket.to(`presence:${tenantId}`).emit('presence:online', { userId, name, avatar });

  // Respond with current online list on request
  socket.on('presence:list', () => {
    socket.emit('presence:list', getOnlineUsers(tenantId));
  });

  // Status update (away, busy, etc.)
  socket.on('presence:status', ({ status }) => {
    socket.to(`presence:${tenantId}`).emit('presence:status', { userId, status });
  });

  socket.on('disconnect', () => {
    presenceMap.get(tenantId)?.delete(userId);
    socket.to(`presence:${tenantId}`).emit('presence:offline', { userId });
  });
};
