import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email({ pattern: z.regexes.email }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be less than 20 characters")
    .regex(/[a-z]/, "Password must contain atleast one lowercase")
    .regex(/[A-Z]/, "Password must contain atleast one uppercase")
    .regex(/[0-9]/, "Password must contain atleast one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
});

export const loginSchema = z.object({
  email: z.email({ pattern: z.regexes.email }).trim().toLowerCase(),
  password: z.string("Please enter your password"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
