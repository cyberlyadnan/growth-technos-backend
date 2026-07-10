import { PaginationQuery, PaginationMeta } from '@core/types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePaginationQuery(query: PaginationQuery): {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
} {
  const page = Math.max(DEFAULT_PAGE, Number(query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const sortField = query.sort || 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

  return { page, limit, skip, sort };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function buildSearchFilter(
  search: string | undefined,
  fields: string[],
): Record<string, unknown> {
  if (!search?.trim()) return {};

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: search.trim(), $options: 'i' },
    })),
  };
}
