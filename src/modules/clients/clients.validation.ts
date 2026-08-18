import { z } from "zod";

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

export type ICreateClient = z.infer<typeof createClientSchema>;
