import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import ApiError, { type FieldError } from '../utils/ApiError';
import logger from '../shared/utils/logger';
import { HTTP, ENV } from '../constants';

const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const errors: FieldError[] = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return new ApiError(HTTP.UNPROCESSABLE, 'Validation failed', errors);
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  ) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field    = Object.keys(keyValue ?? {})[0] ?? 'field';
    return ApiError.conflict(`${field} already exists`);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid ${err.path}: ${String(err.value)}`);
  }

  if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid token');
    if (err.name === 'TokenExpiredError')  return ApiError.unauthorized('Token expired');
    logger.error(`[UNCAUGHT ERROR] ${err.message}`, { stack: err.stack });
  }

  return new ApiError(HTTP.INTERNAL_ERROR, 'Internal server error');
};

const errorMiddleware: ErrorRequestHandler = (err, req: Request, res: Response, _next: NextFunction) => {
  const normalized = normalizeError(err);

  if (!normalized.isOperational) {
    logger.error({
      message:   (err as Error).message,
      stack:     (err as Error).stack,
      path:      req.path,
      method:    req.method,
      requestId: res.locals.requestId,
    });
  } else {
    logger.warn(
      `[${req.method}] ${req.path} → ${normalized.statusCode}: ${normalized.message}`
    );
  }

  res.status(normalized.statusCode).json({
    success:    false,
    statusCode: normalized.statusCode,
    message:    normalized.message,
    ...(normalized.field            && { field:  normalized.field }),
    ...(res.locals?.requestId       && { requestId: res.locals.requestId }),
    ...(normalized.errors?.length   && { errors: normalized.errors }),
    ...(process.env.NODE_ENV === ENV.DEVELOPMENT && { stack: (err as Error).stack }),
  });
};

export default errorMiddleware;
module.exports = errorMiddleware;
module.exports.default = errorMiddleware;
