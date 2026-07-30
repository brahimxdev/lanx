import { z } from "zod";

// Reusable search schema
const searchSchema = z
  .string()
  .min(1, "search query must be atleast 1 characters")
  .max(64, "Search query must be less than 64 characters")
  .trim()
  .optional();

export const listCountriesSchema = z.object({
  // Filteration
  search: searchSchema,
});

export const listCurrenciesSchema = z.object({
  // Filteration
  search: searchSchema,
});

export const listProfessionsSchema = z.object({
  // Filteration
  search: searchSchema,
  // Pagination
  limit: z.coerce.number().int().min(1).max(30).default(30),
  page: z.coerce.number().int().min(1).default(1),
});

export type IListProfessionsQuery = z.infer<typeof listProfessionsSchema>;
export type IListCountriesQuery = z.infer<typeof listCountriesSchema>;
export type IListCurrenciesQuery = z.infer<typeof listCurrenciesSchema>;
