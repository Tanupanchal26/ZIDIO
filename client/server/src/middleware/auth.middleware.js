const User       = require('../models/User.model');
const { verifyAccessToken } = require('../services/jwt.service');
const ApiError   = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger     = require('../utils/logger');
const { ROLES, ROLE_HIERARCHY, USER_STATUS } = require('../constants');

// ── authenticate() ────────────────────────────────────────────────────────────
/**
 * Verifies the Bearer access token and attaches `req.user`.
 * Single DB query — selects passwordChangedAt in the same call.
 */
exports.authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token  =
    (header?.startsWith('Bearer ') ? header.split(' ')[1] : null) ||
    req.headers['x-access-token'];

  if (!token) throw ApiError.unauthorized('Access token required');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    throw ApiError.unauthorized(msg);
  }

  // Single query — fetch passwordChangedAt in the same call (was two queries before)
  const user = await User.findById(decoded.id).select('+passwordChangedAt');
  if (!user) throw ApiError.unauthorized('User no longer exists');

  // Account state checks
  if (user.status === USER_STATUS.BANNED)
    throw ApiError.forbidden('Account suspended. Contact support.');
  if (user.status === USER_STATUS.LOCKED)
    throw ApiError.forbidden('Account is locked.');
  if (user.status === USER_STATUS.INACTIVE)
    throw ApiError.forbidden('Account is inactive.');

  // Token invalidation after password change
  if (user.passwordChangedAt) {
    const tokenIssuedAt = decoded.iat * 1000;
    if (user.passwordChangedAt.getTime() > tokenIssuedAt) {
      logger.warn(`[AUTH] Token used after password change — userId: ${user._id}`);
      throw ApiError.unauthorized('Password recently changed. Please log in again.');
    }
  }

  req.user = user;
  next();
});

exports.protect = exports.authenticate;

// ── authorize(...roles) ───────────────────────────────────────────────────────
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  if (!roles.includes(req.user.role)) {
    logger.warn(`[AUTH] Forbidden — userId: ${req.user._id}, role: ${req.user.role}, required: ${roles.join('|')}`);
    throw ApiError.forbidden(
      `Role '${req.user.role}' does not have permission for this action`
    );
  }
  next();
};

// ── roleGuard(minimumRole) ────────────────────────────────────────────────────
exports.roleGuard = (minimumRole) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  const userLevel     = ROLE_HIERARCHY.indexOf(req.user.role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minimumRole);
  if (userLevel === -1 || requiredLevel === -1)
    throw ApiError.internal('Invalid role configuration');
  if (userLevel > requiredLevel) {
    throw ApiError.forbidden(
      `Minimum required role: '${minimumRole}'. Your role: '${req.user.role}'`
    );
  }
  next();
};

// ── scopeTenant() ─────────────────────────────────────────────────────────────
exports.scopeTenant = (field = 'tenantId') => (req, res, next) => {
  req.tenantId     = req.user?.tenantId;
  req.tenantFilter = { [field]: req.tenantId };
  next();
};

// ── verifyOwnerOrAdmin() ──────────────────────────────────────────────────────
exports.verifyOwnerOrAdmin = (req, res, next) => {
  const isOwner = req.user._id.toString() === req.params.id;
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role);
  if (!isOwner && !isAdmin)
    throw ApiError.forbidden('You can only access your own resources');
  next();
};
