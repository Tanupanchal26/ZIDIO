// @ts-nocheck
const { Queue, Worker, QueueEvents } = require('bullmq');
const logger = require('../shared/utils/logger').default;

let aiQueue = null;
let aiWorker = null;

const QUEUE_NAME = 'ai-jobs';

// BullMQ requires a plain connection config (not a redis client instance)
const getConnection = () => {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { url };
};

exports.initAIQueue = () => {
  const connection = getConnection();
  if (!connection) {
    logger.warn('[AI Queue] Redis unavailable — AI jobs will run synchronously (no queue)');
    return;
  }

  aiQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts:         3,
      backoff:          { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail:     { count: 50 },
    },
  });

  const events = new QueueEvents(QUEUE_NAME, { connection });
  events.on('failed', ({ jobId, failedReason }) =>
    logger.error(`[AI Queue] Job ${jobId} failed: ${failedReason}`)
  );

  logger.info('[AI Queue] Initialized');
};

exports.initAIWorker = (processorFn) => {
  const connection = getConnection();
  if (!connection) return;

  aiWorker = new Worker(QUEUE_NAME, processorFn, { connection, concurrency: 3 });
  aiWorker.on('completed', (job) => logger.info(`[AI Queue] Job ${job.id} (${job.name}) completed`));
  aiWorker.on('failed', (job, err) => logger.error(`[AI Queue] Job ${job?.id} failed: ${err.message}`));

  logger.info('[AI Queue] Worker started (concurrency: 3)');
};

exports.enqueueAIJob = async (name, data) => {
  if (!aiQueue) return null;
  return aiQueue.add(name, data);
};

exports.getAIQueue = () => aiQueue;

export {};
