import { z } from "zod";

export const listProfessionsSchema = z.object({
  // Filteration
  search: z
    .string()
    .min(1, "search query must be atleast 1 characters")
    .max(64, "Search query must be less than 64 characters")
    .trim()
    .optional(),
  // Pagination
  limit: z.coerce.number().int().min(1).max(30).default(30),
  page: z.coerce.number().int().min(1).default(1),

});

export type IListProfessionsQuery = z.infer<typeof listProfessionsSchema>;
