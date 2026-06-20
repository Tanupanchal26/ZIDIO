// @ts-nocheck
// ─── HTTP Status Codes ───────────────────────────────────────────────────────
const HTTP = {
  OK:                  200,
  CREATED:             201,
  NO_CONTENT:          204,
  BAD_REQUEST:         400,
  UNAUTHORIZED:        401,
  FORBIDDEN:           403,
  NOT_FOUND:           404,
  CONFLICT:            409,
  UNPROCESSABLE:       422,
  TOO_MANY_REQUESTS:   429,
  INTERNAL_ERROR:      500,
  SERVICE_UNAVAILABLE: 503,
};

// ─── RBAC Roles (ordered by privilege) ──────────────────────────────────────
const ROLES = {
  ADMIN:  'admin',
  MEMBER: 'member',
};

const ROLE_HIERARCHY = [
  ROLES.ADMIN,
  ROLES.MEMBER,
];

// ─── User Status ─────────────────────────────────────────────────────────────
const USER_STATUS = {
  ACTIVE:   'active',
  INACTIVE: 'inactive',
  BANNED:   'banned',
  LOCKED:   'locked',
};

// ─── Auth Security ───────────────────────────────────────────────────────────
const AUTH = {
  BCRYPT_ROUNDS:          12,
  MAX_LOGIN_ATTEMPTS:     5,
  LOCK_DURATION_MINUTES:  15,
  VERIFY_TOKEN_EXPIRES:   24 * 60 * 60 * 1000,   // 24 hours in ms
  RESET_TOKEN_EXPIRES:    60 * 60 * 1000,         // 1 hour in ms
  COOKIE_MAX_AGE:         7 * 24 * 60 * 60 * 1000, // 7 days in ms
};


const PLANS = {
  FREE:       'free',
  PRO:        'pro',
  ENTERPRISE: 'enterprise',
};

// ─── Meeting ─────────────────────────────────────────────────────────────────
const MEETING_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE:    'active',
  ENDED:     'ended',
};

// ─── Task ────────────────────────────────────────────────────────────────────
const TASK_STATUS = {
  TODO:        'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW:   'in_review',
  DONE:        'done',
};

const TASK_PRIORITY = {
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
  URGENT: 'urgent',
};

// ─── Token Types ─────────────────────────────────────────────────────────────
const TOKEN_TYPE = {
  ACCESS:         'access',
  REFRESH:        'refresh',
  EMAIL_VERIFY:   'email_verify',
  PASSWORD_RESET: 'password_reset',
};

// ─── Environment ─────────────────────────────────────────────────────────────
const ENV = {
  DEVELOPMENT: 'development',
  STAGING:     'staging',
  PRODUCTION:  'production',
  TEST:        'test',
};

// ─── Pagination defaults ─────────────────────────────────────────────────────
const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
};

// ─── Cache TTL (seconds) ─────────────────────────────────────────────────────
const CACHE_TTL = {
  USER_SESSION:  900,    // 15 min
  MEETING_LIST:  120,    // 2 min
  AI_SUMMARY:    86400,  // 24 h
  RATE_LIMIT:    60,     // 1 min
};

// ─── AI ──────────────────────────────────────────────────────────────────────
const AI_MODEL = {
  GPT4O:       'gpt-4o',
  GPT4_TURBO:  'gpt-4-turbo',
  WHISPER:     'whisper-1',
};

module.exports = {
  HTTP,
  ROLES,
  ROLE_HIERARCHY,
  USER_STATUS,
  AUTH,
  PLANS,
  MEETING_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  TOKEN_TYPE,
  ENV,
  PAGINATION,
  CACHE_TTL,
  AI_MODEL,
};

export {};
