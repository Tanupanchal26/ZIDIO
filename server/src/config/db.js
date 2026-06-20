const mongoose = require('mongoose');
const { mongo, isProd } = require('./env');
const logger = require('../utils/logger');

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS:     10000,
  maxPoolSize:              isProd ? 20 : 5,
  minPoolSize:              2,
  socketTimeoutMS:          45000,
  family:                   4,      // use IPv4, skip IPv6
};

// Retry wrapper — tries up to `retries` times with exponential backoff
const connectWithRetry = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongo.uri, MONGO_OPTIONS);
      return; // success
    } catch (err) {
      logger.error(`[DB] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * attempt)); // exponential backoff
    }
  }
};

const connectDB = async () => {
  mongoose.connection.on('connected',    () => logger.info('[DB] MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('[DB] MongoDB disconnected'));
  mongoose.connection.on('error',        (e) => logger.error(`[DB] Error: ${e.message}`));

  try {
    await connectWithRetry();
    logger.info(`[DB] Connected to: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error(`[DB] Failed to connect after retries — exiting. ${err.message}`);
    process.exit(1);
  }
};

// Graceful disconnect — called on SIGTERM/SIGINT
const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('[DB] MongoDB connection closed');
};

module.exports = { connectDB, disconnectDB };
