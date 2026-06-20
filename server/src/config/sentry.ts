// @ts-nocheck
// Sentry integration — graceful degradation when @sentry/node is not installed
// To enable Sentry: npm install @sentry/node && set SENTRY_DSN in .env

let Sentry = null;

const initSentry = (app) => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] No SENTRY_DSN set — error monitoring disabled');
    return;
  }

  try {
    Sentry = require('@sentry/node');
    
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });

    console.log('[Sentry] Initialized successfully');
  } catch (err) {
    console.log('[Sentry] @sentry/node not installed — install the package to enable');
    Sentry = null;
  }
};

const sentryRequestHandler = () => {
  if (!Sentry) return (req, res, next) => next();
  try {
    return Sentry.Handlers.requestHandler();
  } catch {
    return (req, res, next) => next();
  }
};

const sentryErrorHandler = () => {
  if (!Sentry) return (err, req, res, next) => next(err);
  try {
    return Sentry.Handlers.errorHandler();
  } catch {
    return (err, req, res, next) => next(err);
  }
};

const captureException = (err, context = {}) => {
  if (Sentry) {
    Sentry.captureException(err, { extra: context });
  }
};

module.exports = { initSentry, sentryRequestHandler, sentryErrorHandler, captureException };

export {};
