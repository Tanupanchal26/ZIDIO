// tenantId → Map<userId, Set<socketId>>
const presenceMap = new Map();

const getOnlineUsers = (tenantId) => [...(presenceMap.get(tenantId)?.keys() || [])];

module.exports = (io, socket) => {
  const { id: userId, tenantId, name, avatar } = socket.user || {};
  if (!userId || !tenantId) return;

  socket.join(`presence:${tenantId}`);

  // Track socket count per user
  if (!presenceMap.has(tenantId)) presenceMap.set(tenantId, new Map());
  const tenantPresence = presenceMap.get(tenantId);
  if (!tenantPresence.has(userId)) tenantPresence.set(userId, new Set());
  const sockets = tenantPresence.get(userId);
  const isFirstConnection = sockets.size === 0;
  sockets.add(socket.id);

  // Only broadcast 'online' on first connection for this user
  if (isFirstConnection) {
    socket.to(`presence:${tenantId}`).emit('presence:online', { userId, name, avatar });
  }

  socket.on('presence:list', () => {
    socket.emit('presence:list', getOnlineUsers(tenantId));
  });

  socket.on('presence:status', ({ status }) => {
    socket.to(`presence:${tenantId}`).emit('presence:status', { userId, status });
  });

  socket.on('disconnect', () => {
    sockets.delete(socket.id);
    // Only broadcast 'offline' when the last socket for this user disconnects
    if (sockets.size === 0) {
      tenantPresence.delete(userId);
      socket.to(`presence:${tenantId}`).emit('presence:offline', { userId });
    }
  });
};
