const { PAGINATION } = require('../constants');

/**
 * Applies skip/limit to a Mongoose query based on page & limit params.
 * Returns { skip, limit, page } for use in paginated responses.
 */
const paginate = (query, { page, limit } = {}) => {
  const p = Math.max(1, parseInt(page, 10)  || PAGINATION.DEFAULT_PAGE);
  const l = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  return {
    query: query.skip((p - 1) * l).limit(l),
    page:  p,
    limit: l,
  };
};

/** Generates a short uppercase room code, e.g. "A3FX92" */
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

/** Creates a URL-safe slug from a string, e.g. "Foo Bar!" → "foo-bar" */
const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Picks only the specified keys from an object.
 * Useful for filtering request bodies before DB writes.
 */
const pick = (obj, keys) =>
  keys.reduce((acc, key) => { if (key in obj) acc[key] = obj[key]; return acc; }, {});

/** Strips undefined values from an object (safe for MongoDB $set) */
const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

module.exports = { paginate, generateRoomCode, slugify, pick, clean };
