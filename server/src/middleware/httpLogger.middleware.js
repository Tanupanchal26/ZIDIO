const morgan = require('morgan');
const logger = require('../utils/logger');

// Pipe Morgan output into Winston so all logs go through one system
const stream = {
  write: (message) => logger.http(message.trim()),
};

// ── Tokens ───────────────────────────────────────────────────────────────────
morgan.token('request-id', (req, res) => res.locals?.requestId ?? '-');
morgan.token('tenant-id',  (req)      => req.user?.tenantId ?? '-');

const DEV_FORMAT = ':method :url :status :res[content-length] - :response-time ms [:request-id]';

// JSON format gives structured logs for CloudWatch / Datadog / ELK parsing
const PROD_FORMAT = JSON.stringify({
  requestId:    ':request-id',
  tenantId:     ':tenant-id',
  method:       ':method',
  url:          ':url',
  status:       ':status',
  responseTime: ':response-time ms',
  contentLength:':res[content-length]',
  userAgent:    ':user-agent',
  ip:           ':remote-addr',
});

const isDev = process.env.NODE_ENV !== 'production';

const httpLogger = morgan(isDev ? DEV_FORMAT : PROD_FORMAT, {
  stream,
  // Skip health-check polling from logs to reduce noise
  skip: (req) => req.path === '/health',
});

module.exports = httpLogger;
