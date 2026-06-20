// @ts-nocheck
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { HTTP, ENV } = require('../constants');

/**
 * Converts known library errors into ApiError instances so the
 * final handler always works with a consistent shape.
 */
const normalizeError = (err) => {
  // Already an operational ApiError
  if (err instanceof ApiError) return err;

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map(e => ({
      field:   e.path,
      message: e.message,
    }));
    return new ApiError(HTTP.UNPROCESSABLE, 'Validation failed', errors);
  }

  // Mongoose duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] ?? 'field';
    return ApiError.conflict(`${field} already exists`);
  }

  // Mongoose bad ObjectId
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid token');
  if (err.name === 'TokenExpiredError') return ApiError.unauthorized('Token expired');

  // Fallback — unknown programmer error
  logger.error(`[UNCAUGHT ERROR] ${err.message}`, { stack: err.stack });
  return new ApiError(HTTP.INTERNAL_ERROR, 'Internal server error');
};

// ── Final error handler (must have 4 params for Express to recognise it) ────
const errorMiddleware = (err, req, res, _next) => {
  const normalized = normalizeError(err);

  // Log full stack for unexpected (non-operational) errors
  if (!normalized.isOperational) {
    logger.error({
      message: err.message,
      stack:   err.stack,
      path:    req.path,
      method:  req.method,
      requestId: res.locals.requestId,
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} → ${normalized.statusCode}: ${normalized.message}`);
  }

  const body = {
    success:    false,
    statusCode: normalized.statusCode,
    message:    normalized.message,
    requestId:  res.locals?.requestId,
    ...(normalized.errors?.length && { errors: normalized.errors }),
    // Only expose stack in development
    ...(process.env.NODE_ENV === ENV.DEVELOPMENT && { stack: err.stack }),
  };

  res.status(normalized.statusCode).json(body);
};

module.exports = errorMiddleware;

export {};
