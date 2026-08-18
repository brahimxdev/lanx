import { z } from "zod";

// Reusable search schema
const searchSchema = z
  .string()
  .min(1, "search query must be atleast 1 characters")
  .max(64, "Search query must be less than 64 characters")
  .trim()
  .optional();

export const listCountriesSchema = z.object({
  // Filtration
  search: searchSchema,
});

export const listCurrenciesSchema = z.object({
  // Filtration
  search: searchSchema,
});

export const listProfessionsSchema = z.object({
  // Filtration
  search: searchSchema,
});

export type IListProfessionsQuery = z.infer<typeof listProfessionsSchema>;
export type IListCountriesQuery = z.infer<typeof listCountriesSchema>;
export type IListCurrenciesQuery = z.infer<typeof listCurrenciesSchema>;
