// @ts-nocheck
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// ── Custom log format ────────────────────────────────────────────────────────
const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack ? `[${ts}] ${level}: ${message}\n${stack}` : `[${ts}] ${level}: ${message}`
  )
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ── Transports ───────────────────────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, '../../logs');

const fileRotateTransport = new DailyRotateFile({
  dirname:       LOGS_DIR,
  filename:      'app-%DATE%.log',
  datePattern:   'YYYY-MM-DD',
  zippedArchive: true,
  maxSize:       '20m',
  maxFiles:      '30d',
  level:         'info',
});

const errorFileTransport = new DailyRotateFile({
  dirname:       LOGS_DIR,
  filename:      'error-%DATE%.log',
  datePattern:   'YYYY-MM-DD',
  zippedArchive: true,
  maxSize:       '20m',
  maxFiles:      '30d',
  level:         'error',
});

const isDev = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level:       isDev ? 'debug' : 'info',
  format:      isDev ? devFormat : prodFormat,
  exitOnError: false,
  transports: [
    new winston.transports.Console(),
    ...(!isDev ? [fileRotateTransport, errorFileTransport] : []),
  ],
  // Unhandled promise rejection & uncaught exception fallback
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(LOGS_DIR, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(LOGS_DIR, 'rejections.log') }),
  ],
});

module.exports = logger;

export {};
