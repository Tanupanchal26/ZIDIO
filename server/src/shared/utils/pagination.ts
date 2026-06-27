export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}

/** Convert limit/offset query params to a PageMeta object */
export const getPagination = (total: number, limit = 20, offset = 0) => {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return { total, limit, offset, page, pages };
};
