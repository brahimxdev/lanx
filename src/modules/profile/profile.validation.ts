import { z } from "zod";

export const createProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  businessName: z.string().trim().max(150).optional(),
  professionId: z.uuid().optional(),
  countryCode: z.string().length(2).optional(),
  currencyCode: z.string().length(3).optional(),
  logoUrl: z.url().optional(),
});

export type ICreateProfile = z.infer<typeof createProfileSchema>;

