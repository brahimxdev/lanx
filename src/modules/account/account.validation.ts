import { z } from "zod";

// Reusable password schema
const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password must be less than 64 characters")
  .regex(/[a-z]/, "Password must contain atleast one lowercase")
  .regex(/[A-Z]/, "Password must contain atleast one uppercase")
  .regex(/[0-9]/, "Password must contain atleast one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
  .refine((value) => value === value.trim(), {
    message: "Password must not have leading or trailing spaces",
  });

// Reusable email schema
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ pattern: z.regexes.email }));

// Reusable confirmation code schema
const confirmationCodeSchema = z.string().trim().length(6, "Code must be 6 characters");

// Change password schema - (need auth access)
export const changePasswordSchema = z.object({
  existingPassword: strongPasswordSchema,
  newPassword: strongPasswordSchema,
});

// Request change of email schema - (need auth access)
export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  currentPassword: strongPasswordSchema,
});

// Confirm change of email schema - (need auth access)
export const confirmChangeEmailSchema = z.object({
  confirmationCode: confirmationCodeSchema,
});
export type IChangePassword = z.infer<typeof changePasswordSchema>;
export type IChangeEmail = z.infer<typeof changeEmailSchema>;
export type IConfirmChangeEmail = z.infer<typeof confirmChangeEmailSchema>;
