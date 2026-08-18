import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from "./pagination.constant.js";

export const createPaginationSchema = (maxLimit: number = MAX_LIMIT) => {
  return z.object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(DEFAULT_LIMIT),
  });
};

export const paginationSchema = createPaginationSchema();

export type IPaginationQuery = z.infer<typeof paginationSchema>;

export const createSortSchema = <T extends readonly [string, ...string[]]>(
  sortableFields: T,
  defaultField: T[number] = sortableFields[0]
) => {
  return z.object({
    sortBy: z.enum(sortableFields).default(defaultField),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  });
};
