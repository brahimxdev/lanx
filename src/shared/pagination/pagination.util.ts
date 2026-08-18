import type { PaginationMeta, Paginated } from "./pagination.types.js";

export const toOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const paginate = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): Paginated<T> => {
  return {
    data,
    meta: buildPaginationMeta(page, limit, total),
  };
};
