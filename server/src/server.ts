// Load and validate env FIRST — crashes early if misconfigured
const config = require('./config/env');

const http   = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const app    = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { connectRedis, getRedisClient } = require('./config/redis');
const initSockets = require('./sockets');
const { initAIQueue, initAIWorker } = require('./queues/ai.queue');
const aiJobProcessor = require('./queues/ai.worker');
const logger = require('./shared/utils/logger').default;

const server = http.createServer(app);

// Socket.io — CORS mirrors app CORS config
const io = new Server(server, {
  cors: {
    origin:      true,
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

// ── Startup ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
    const redis = await connectRedis();

    // ── Socket.IO Redis adapter — enables cross-pod pub/sub ──────────────────
    if (redis) {
      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('[SOCKET] Redis adapter attached — cross-pod messaging enabled');
    } else {
      logger.warn('[SOCKET] Redis unavailable — running single-node Socket.IO (no cross-pod messaging)');
    }

    initSockets(io);

    // ── AI job queue ───────────────────────────────────────────────────
    initAIQueue();
    initAIWorker(aiJobProcessor);

    // Start the server
    server.listen(config.port, '0.0.0.0', () => {
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
});

start();

export {};
