// @ts-nocheck
const User       = require('../models/User');
const { verifyAccessToken } = require('../services/jwt.service');
const ApiError   = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, ROLE_HIERARCHY, USER_STATUS } = require('../constants');

// ── authenticate() ────────────────────────────────────────────────────────────
/**
 * Verifies the Bearer access token and attaches `req.user`.
 * Also blocks locked / banned / inactive accounts.
 *
 * Token source precedence:
 *   1. Authorization: Bearer <token>   (API clients, Postman)
 *   2. x-access-token header           (legacy support)
 */
exports.authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token  =
    (header?.startsWith('Bearer ') ? header.split(' ')[1] : null) ||
    req.headers['x-access-token'] ||
    req.query.token;

  if (!token) throw ApiError.unauthorized('Access token required');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    throw ApiError.unauthorized(msg);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  // Account state checks
  if (user.status === USER_STATUS.BANNED)
    throw ApiError.forbidden('Account suspended. Contact support.');

  if (user.status === USER_STATUS.LOCKED)
    throw ApiError.forbidden('Account is locked.');

  if (user.status === USER_STATUS.INACTIVE)
    throw ApiError.forbidden('Account is inactive.');

  // Check if password was changed after the token was issued
  if (user.passwordChangedAt) {
    // passwordChangedAt is stored but select:false — load it explicitly
    const changedUser = await User.findById(decoded.id).select('+passwordChangedAt');
    const tokenIssuedAt = decoded.iat * 1000; // iat is in seconds
    if (changedUser.passwordChangedAt.getTime() > tokenIssuedAt) {
      throw ApiError.unauthorized('Password recently changed. Please log in again.');
    }
  }

  req.user = user;
  next();
});

// Alias used in existing routes
exports.protect = exports.authenticate;

// ── authorize(...roles) ───────────────────────────────────────────────────────
/**
 * Checks that req.user.role is one of the explicitly listed roles.
 * Must come AFTER authenticate().
 *
 * Usage:  router.delete('/users/:id', authenticate, authorize('super_admin', 'admin'), handler)
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  
  const allowedRoles = [...roles];
  if (roles.includes('admin') && !allowedRoles.includes('super_admin')) {
    allowedRoles.push('super_admin');
  }

  if (!allowedRoles.includes(req.user.role)) {
    throw ApiError.forbidden(
      `Role '${req.user.role}' does not have permission for this action`
    );
  }
  next();
};

// ── roleGuard(minimumRole) ────────────────────────────────────────────────────
/**
 * Hierarchy-based guard — allows the specified role AND anything ABOVE it.
 * Uses ROLE_HIERARCHY order: super_admin > admin > manager > employee > guest
 *
 * Usage:  roleGuard('manager')  →  allows super_admin, admin, manager
 *         roleGuard('employee') →  allows all roles except guest
 */
exports.roleGuard = (minimumRole) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');

  const userLevel    = ROLE_HIERARCHY.indexOf(req.user.role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minimumRole);

  if (userLevel === -1 || requiredLevel === -1) {
    throw ApiError.internal('Invalid role configuration');
  }

  // Lower index = higher privilege in ROLE_HIERARCHY
  if (userLevel > requiredLevel) {
    throw ApiError.forbidden(
      `Minimum required role: '${minimumRole}'. Your role: '${req.user.role}'`
    );
  }
  next();
};

// ── scopeTenant() ─────────────────────────────────────────────────────────────
/**
 * Injects tenantId from the authenticated user into req.tenantFilter.
 * Used by controllers/repositories to scope queries automatically.
 */
exports.scopeTenant = (field = 'tenantId') => (req, res, next) => {
  req.tenantId     = req.user?.tenantId;
  req.tenantFilter = { [field]: req.tenantId };
  next();
};

// ── verifyOwnerOrAdmin() ──────────────────────────────────────────────────────
/**
 * Allows access if the authenticated user owns the resource (req.params.id)
 * OR if they are admin/super_admin.
 *
 * Usage:  router.get('/users/:id', authenticate, verifyOwnerOrAdmin, handler)
 */
exports.verifyOwnerOrAdmin = (req, res, next) => {
  const isOwner = req.user._id.toString() === req.params.id;
  const isAdmin = [ROLES.ADMIN, 'super_admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You can only access your own resources');
  }
  next();
};

export {};
