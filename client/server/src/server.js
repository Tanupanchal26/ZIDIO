// Load and validate env FIRST — crashes early if misconfigured
const config = require('./config/env');

const http   = require('http');
const { Server } = require('socket.io');
const app    = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const initSockets = require('./sockets');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Socket.IO — CORS mirrors app CORS config
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

  // Force exit after 15s if shutdown hangs
  const forceExit = setTimeout(() => {
    logger.error('[SERVER] Forced exit after 15s timeout');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    // 1. Stop accepting new HTTP connections
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );

    // 2. Close Socket.IO (terminates all WS connections)
    await new Promise((resolve) => io.close(resolve));

    // 3. Close DB + Redis
    await disconnectDB();
    await disconnectRedis();

    logger.info('[SERVER] Clean shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error(`[SERVER] Error during shutdown: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM')); // Docker / Kubernetes stop
process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C in dev

// Catch unhandled rejections that slipped past asyncHandler
process.on('unhandledRejection', (reason) => {
  logger.error(`[SERVER] Unhandled rejection: ${reason}`);
  shutdown('unhandledRejection');
});

start();
