/**
 * Unified response envelope:
 * { success, statusCode, message, data, meta, requestId }
 */
class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.success    = statusCode < 400;
    this.statusCode = statusCode;
    this.message    = message;
    if (data !== null)  this.data = data;
    if (meta !== null)  this.meta = meta;
  }

  send(res) {
    // Attach requestId from res.locals if set by requestId middleware
    if (res.locals?.requestId) this.requestId = res.locals.requestId;
    return res.status(this.statusCode).json(this);
  }

  // ── Static helpers ─────────────────────────────────────────────────────────
  static ok(res, data, message = 'Success', meta = null) {
    return new ApiResponse(200, message, data, meta).send(res);
  }

  static created(res, data, message = 'Created successfully') {
    return new ApiResponse(201, message, data).send(res);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, data, { page, limit, total }) {
    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext:    page * limit < total,
      hasPrev:    page > 1,
    };
    return new ApiResponse(200, 'Success', data, meta).send(res);
  }
}

module.exports = ApiResponse;
