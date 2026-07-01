// @ts-nocheck
const logger = require('../shared/utils/logger').default;

exports.initAIQueue  = () => logger.info('[AI Queue] Running in synchronous mode (no Redis)');
exports.initAIWorker = () => {};
exports.enqueueAIJob = async () => null;
exports.getAIQueue   = () => null;

export {};
