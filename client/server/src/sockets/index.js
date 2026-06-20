const { verifyAccessToken } = require('../services/jwt.service');
const User                  = require('../models/User.model');
const chatSocket             = require('./chat.socket');
const meetingSocket          = require('./meeting.socket');
const notificationSocket     = require('./notification.socket');
const presenceSocket         = require('./presence.socket');
const logger                 = require('../utils/logger');
const { USER_STATUS }        = require('../constants');

const initSockets = (io) => {
  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        logger.warn(`[SOCKET] Auth failed — no token (${socket.handshake.address})`);
        return next(new Error('Authentication required'));
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        logger.warn(`[SOCKET] Auth failed — ${msg} (${socket.handshake.address})`);
        return next(new Error(msg));
      }

      const user = await User.findById(decoded.id)
        .select('name email avatar tenantId role status')
        .lean();

      if (!user) {
        logger.warn(`[SOCKET] Auth failed — user not found: ${decoded.id}`);
        return next(new Error('User not found'));
      }

      if (user.status === USER_STATUS.BANNED || user.status === USER_STATUS.LOCKED) {
        logger.warn(`[SOCKET] Auth failed — account restricted: ${user._id}`);
        return next(new Error('Account restricted'));
      }

      socket.user = {
        id:       user._id.toString(),
        name:     user.name,
        email:    user.email,
        avatar:   user.avatar,
        tenantId: user.tenantId?.toString(),
        role:     user.role,
      };

      next();
    } catch (err) {
      logger.error(`[SOCKET] Auth middleware error: ${err.message}`);
      next(new Error('Authentication error'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`[SOCKET] Connected: ${socket.user.id} (${socket.id})`);

    chatSocket(io, socket);
    meetingSocket(io, socket);
    notificationSocket(io, socket);
    presenceSocket(io, socket);

    // Cleanup all rooms on disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`[SOCKET] Disconnected: ${socket.user.id} (${socket.id}) — ${reason}`);
      // Socket.IO automatically removes the socket from all rooms on disconnect;
      // domain-level cleanup (presence, etc.) is handled in presenceSocket.
    });

    socket.on('error', (err) => {
      logger.error(`[SOCKET] Socket error for user ${socket.user?.id}: ${err.message}`);
    });
  });
};

module.exports = initSockets;
