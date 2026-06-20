const { HTTP } = require('../constants');

/**
 * Operational error — expected, user-facing errors (4xx mostly).
 * Distinguished from programmer errors so the error handler can behave differently.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode    = statusCode;
    this.errors        = errors;   // array of field-level validation errors
    this.isOperational = true;     // marks as a known, handled error
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Static factory helpers ─────────────────────────────────────────────────
  static badRequest(msg, errors)  { return new ApiError(HTTP.BAD_REQUEST,  msg, errors); }
  static unauthorized(msg = 'Unauthorized')  { return new ApiError(HTTP.UNAUTHORIZED,  msg); }
  static forbidden(msg = 'Forbidden')        { return new ApiError(HTTP.FORBIDDEN,      msg); }
  static notFound(msg = 'Resource not found'){ return new ApiError(HTTP.NOT_FOUND,      msg); }
  static conflict(msg)            { return new ApiError(HTTP.CONFLICT,      msg); }
  static internal(msg = 'Internal server error') { return new ApiError(HTTP.INTERNAL_ERROR, msg); }
}

module.exports = ApiError;
