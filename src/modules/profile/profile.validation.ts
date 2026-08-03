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

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  businessName: z.string().trim().max(150).nullable().optional(),
  professionId: z.uuid().nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  currencyCode: z.string().length(3).nullable().optional(),
});

export type ICreateProfile = z.infer<typeof createProfileSchema>;
export type IUpdateProfile = z.infer<typeof updateProfileSchema>;
