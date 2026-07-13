import { z } from "zod";

// sign-up schema
export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ pattern: z.regexes.email })),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must be less than 64 characters")
    .regex(/[a-z]/, "Password must contain atleast one lowercase")
    .regex(/[A-Z]/, "Password must contain atleast one uppercase")
    .regex(/[0-9]/, "Password must contain atleast one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
    .refine((value) => value === value.trim(), {
      message: "Password must not have leading or trailing spaces",
    }),
});

export const confirmEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ pattern: z.regexes.email })),
  confirmationCode: z.string().trim().length(6, "Code must be 6 characters"),
});

export type ISignupInput = z.infer<typeof signUpSchema>;
export type IConfirmEmail = z.infer<typeof confirmEmailSchema>;
