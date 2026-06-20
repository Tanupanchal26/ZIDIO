// @ts-nocheck
/**
 * Wraps an async Express route handler and forwards any rejection to next(err).
 * Eliminates try/catch boilerplate in controllers.
 *
 * Usage:  router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

export {};
