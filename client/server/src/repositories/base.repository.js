const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/helpers');

/**
 * Base repository — wraps Mongoose CRUD with:
 * — automatic tenantId scoping on every query
 * — pagination helper
 * — consistent 404 handling
 *
 * Extend this class per model:
 *   class MeetingRepository extends BaseRepository {
 *     constructor() { super(Meeting); }
 *   }
 */
class BaseRepository {
  constructor(Model) {
    this.Model = Model;
  }

  // ── Scope all queries to a tenant ──────────────────────────────────────────
  _scope(tenantId, extra = {}) {
    return tenantId ? { tenantId, ...extra } : extra;
  }

  async findAll(tenantId, filter = {}, options = {}) {
    const { page, limit, sort = { createdAt: -1 }, populate } = options;
    const query = this.Model.find(this._scope(tenantId, filter)).sort(sort);
    if (populate) query.populate(populate);

    if (page || limit) {
      const { query: paginatedQ, page: p, limit: l } = paginate(query, { page, limit });
      const [data, total] = await Promise.all([paginatedQ, this.count(tenantId, filter)]);
      return { data, total, page: p, limit: l };
    }

    return query.lean();
  }

  async findById(id, tenantId, populate) {
    const query = this.Model.findOne(this._scope(tenantId, { _id: id }));
    if (populate) query.populate(populate);
    const doc = await query;
    if (!doc) throw ApiError.notFound(`${this.Model.modelName} not found`);
    return doc;
  }

  async findOne(filter, tenantId) {
    return this.Model.findOne(this._scope(tenantId, filter));
  }

  async create(data) {
    return this.Model.create(data);
  }

  async updateById(id, tenantId, update) {
    const doc = await this.Model.findOneAndUpdate(
      this._scope(tenantId, { _id: id }),
      update,
      { new: true, runValidators: true }
    );
    if (!doc) throw ApiError.notFound(`${this.Model.modelName} not found`);
    return doc;
  }

  async deleteById(id, tenantId) {
    const doc = await this.Model.findOneAndDelete(this._scope(tenantId, { _id: id }));
    if (!doc) throw ApiError.notFound(`${this.Model.modelName} not found`);
    return doc;
  }

  async count(tenantId, filter = {}) {
    return this.Model.countDocuments(this._scope(tenantId, filter));
  }
}

module.exports = BaseRepository;
