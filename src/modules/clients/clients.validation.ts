import { paginationSchema, createSortSchema } from "@/shared/pagination/index.js";
import { z } from "zod";

// Reusable sort schema
const clientsSortSchema = createSortSchema(["createdAt"] as const);

// Reusable email schema
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ pattern: z.regexes.email }));

export const createClientSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: emailSchema,
  companyName: z.string().trim().max(150).optional(),
  notes: z.string().trim().optional(),
});

export const listclientsSchema = paginationSchema.extend({
  ...clientsSortSchema.shape,
  // Filtration
  search: z
    .string()
    .min(1, "search query must be at least 1 characters")
    .max(100, "Search query must be less than 100 characters")
    .trim()
    .optional(),

  // Filtration
  isIncludedArchived: z.enum(["true", "false"]).default("false"),
});

export const getClientSchema = z.object({
  clientId: z.uuid("Invalid client ID"),
});

export const updateClientSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: emailSchema.optional(),
    companyName: z.string().trim().max(150).nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Atleast one field must be provided to update",
  });

export type ICreateClient = z.infer<typeof createClientSchema>;
export type IListClients = z.infer<typeof listclientsSchema>;
export type IGetClient = z.infer<typeof getClientSchema>;
export type IUpdateClient = z.infer<typeof updateClientSchema>;
