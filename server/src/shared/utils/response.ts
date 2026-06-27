import { Request, Response } from 'express';

/** Standard API response wrapper */
export const sendSuccess = (res: Response, data: any, message = 'Success') => {
  return res.status(200).json({
    status: 'success',
    message,
    data,
  });
};

export const sendError = (res: Response, error: any, statusCode = 500, message = 'Error') => {
  const msg = error?.message || error || message;
  return res.status(statusCode).json({
    status: 'error',
    message: msg,
    // For security, avoid sending stack traces in production
    ...(process.env.NODE_ENV !== 'production' && { stack: error?.stack }),
  });
};

/** Convenience wrapper for async route handlers */
export const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => (
  req: Request,
  res: Response,
  next: any
) => {
  Promise.resolve(fn(req, res)).catch(next);
};
