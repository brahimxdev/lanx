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

const confirmationCodeSchema = z.string().trim().length(6, "Code must be 6 characters");

// sign-up schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
});

// Confirm email schema
export const confirmEmailSchema = z.object({
  email: emailSchema,
  confirmationCode: confirmationCodeSchema,
});

// Resend Confirmation Code schema
export const resendConfirmationCodeSchema = z.object({
  email: emailSchema,
});

// Sign in schema
export const signInSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password
export const resetPasswordSchema = z.object({
  email: emailSchema,
  confirmationCode: z.string().trim().length(6, "Code must be 6 characters"),
  newPassword: strongPasswordSchema,
});

export type ISignup = z.infer<typeof signUpSchema>;
export type IConfirmEmail = z.infer<typeof confirmEmailSchema>;
export type IResendConfirmationCode = z.infer<typeof resendConfirmationCodeSchema>;
export type ISignIn = z.infer<typeof signInSchema>;
export type IForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type IResetPassword = z.infer<typeof resetPasswordSchema>;
