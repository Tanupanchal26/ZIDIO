import { Request, Response, NextFunction, RequestHandler } from 'express';
import userService from '../services/user.service';
import { isBlacklisted } from '../utils/redisBlacklist';
import { verifyAccessToken, AccessTokenPayload } from '../services/jwt.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import { ROLES, ROLE_HIERARCHY, USER_STATUS } from '../constants';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const User = require('../models/User');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Tenant = require('../models/Tenant');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Team = require('../models/Team');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Channel = require('../models/Channel');

const extractBearerToken = (req: Request): string | null =>
  req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : (req.headers['x-access-token'] as string | undefined)
      ?? (req.query.token as string | undefined)
      ?? null;

/**
 * Verifies the Bearer access token and attaches `req.user`.
 * Blocks locked / banned / inactive accounts.
 */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) throw ApiError.unauthorized('Access token required');

  let decoded: AccessTokenPayload & { iat?: number };
  try {
    decoded = verifyAccessToken(token) as unknown as AccessTokenPayload & { iat?: number };
  } catch (err) {
    const msg = (err as Error).name === 'TokenExpiredError'
      ? 'Access token expired'
      : 'Invalid access token';
    throw ApiError.unauthorized(msg);
  }

  if (await isBlacklisted(token)) throw ApiError.unauthorized('Token revoked');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user = await userService.getUserForAuth(decoded.id) as any;
  if (!user) throw ApiError.unauthorized('User no longer exists');

  // Auto-remediate missing tenantId (e.g. for Google OAuth users created before the fix)
  if (!user.tenantId) {
    const toSlug = (str: string): string =>
      str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const tenantSlug = `${toSlug(user.name)}-${Date.now()}`;
    const tenant = await Tenant.create({
      name: `${user.name}'s Workspace`,
      slug: tenantSlug,
    });

    user.tenantId = tenant._id;
    await user.save();

    // Create default team
    const team = await Team.create({
      tenantId:  tenant._id,
      name:      'General',
      slug:      'general',
      createdBy: user._id,
      members:   [{ user: user._id, role: 'owner' }],
    });

    // Create default channel
    await Channel.create({
      tenantId:  tenant._id,
      name:      'general',
      slug:      'general',
      createdBy: user._id,
      team:      team._id,
      type:      'public',
      isDefault: true,
      members:   [user._id],
    });
  }

  if (user.status === USER_STATUS.BANNED)
    throw ApiError.forbidden('Account suspended. Contact support.');
  if (user.status === USER_STATUS.LOCKED)
    throw ApiError.forbidden('Account is locked.');
  if (user.status === USER_STATUS.INACTIVE)
    throw ApiError.forbidden('Account is inactive.');

  if (user.passwordChangedAt) {
    const fullUser = await User.findById(decoded.id).select('+passwordChangedAt');
    const tokenIssuedAtMs = (decoded.iat ?? 0) * 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((fullUser as any)?.passwordChangedAt?.getTime() > tokenIssuedAtMs) {
      throw ApiError.unauthorized('Password recently changed. Please log in again.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req.user = user as any;
  next();
});

// Alias used in existing routes
export const protect = authenticate;

/**
 * Checks that req.user.role is one of the explicitly listed roles.
 * Must come AFTER authenticate().
 */
export const authorize = (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');

    const allowedRoles = [...roles];
    if (roles.includes(ROLES.ADMIN) && !allowedRoles.includes(ROLES.SUPER_ADMIN)) {
      allowedRoles.push(ROLES.SUPER_ADMIN);
    }

    if (!allowedRoles.includes(req.user.role as string)) {
      throw ApiError.forbidden(
        `Role '${req.user.role}' does not have permission for this action`
      );
    }
    next();
  };

/**
 * Hierarchy-based guard — allows the specified role AND anything above it.
 */
export const roleGuard = (minimumRole: string): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');

    const userLevel     = ROLE_HIERARCHY.indexOf(req.user.role as typeof ROLE_HIERARCHY[number]);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minimumRole as typeof ROLE_HIERARCHY[number]);

    if (userLevel === -1 || requiredLevel === -1) {
      throw ApiError.internal('Invalid role configuration');
    }

    if (userLevel > requiredLevel) {
      throw ApiError.forbidden(
        `Minimum required role: '${minimumRole}'. Your role: '${req.user.role}'`
      );
    }
    next();
  };

/**
 * Injects tenantId from the authenticated user into req.tenantFilter.
 */
export const scopeTenant = (field = 'tenantId'): RequestHandler =>
  (req, _res, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.tenantId     = (req.user as any)?.tenantId ?? undefined;
    req.tenantFilter = { [field]: req.tenantId };
    next();
  };

/**
 * Allows access if the authenticated user owns the resource (req.params.id)
 * or is admin / super_admin.
 */
export const verifyOwnerOrAdmin: RequestHandler = (req, _res, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = (req.user as any)?._id?.toString() === req.params.id;
  const isAdmin = ([ROLES.ADMIN, ROLES.SUPER_ADMIN] as string[]).includes(req.user?.role ?? '');
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You can only access your own resources');
  }
  next();
};

export default { authenticate, protect, authorize, roleGuard, scopeTenant, verifyOwnerOrAdmin };
module.exports = { authenticate, protect, authorize, roleGuard, scopeTenant, verifyOwnerOrAdmin };
module.exports.default = module.exports;
