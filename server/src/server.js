// Load and validate env FIRST — crashes early if misconfigured
const config = require('./config/env');

const http   = require('http');
const { Server } = require('socket.io');
const app    = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { connectRedis, getRedisClient } = require('./config/redis');
const initSockets = require('./sockets');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Socket.io — CORS mirrors app CORS config
const io = new Server(server, {
  cors: {
    origin:      config.cors.allowedOrigins,
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

initSockets(io);

// ── Startup ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    server.listen(config.port, () => {
      logger.info(`[SERVER] IntellMeet API running on port ${config.port} [${config.env}]`);
    });
  } catch (err) {
    logger.error(`[SERVER] Startup failed: ${err.message}`);
    process.exit(1);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`[SERVER] ${signal} received — shutting down gracefully`);

  server.close(async () => {
    try {
      await disconnectDB();
      const redis = getRedisClient();
      if (redis) await redis.quit();
      logger.info('[SERVER] Clean shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error(`[SERVER] Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  });

  // Force exit after 15s if server.close() hangs
  setTimeout(() => {
    logger.error('[SERVER] Forced exit after 15s timeout');
    process.exit(1);
  }, 15_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM')); // Docker / Kubernetes stop
process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C in dev

// Catch unhandled rejections that slipped past asyncHandler
process.on('unhandledRejection', (reason) => {
  logger.error(`[SERVER] Unhandled rejection: ${reason}`);
  shutdown('unhandledRejection');
});

start();
