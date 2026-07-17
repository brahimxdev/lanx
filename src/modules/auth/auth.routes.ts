import { Router } from "express";
import { validateRequest } from "@/middlewares/validateRequest.js";
import {
  confirmEmailSchema,
  forgotPasswordSchema,
  resendConfirmationCodeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./auth.validation.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { AuthController } from "./auth.controller.js";

export const authRouter = Router();

// base url - /api/v1/auth

// Route for creating user
authRouter.post("/sign-up", validateRequest(signUpSchema), asyncHandler(AuthController.signup));

// Route for confirming email, usable for only sign up to confirm email by code
authRouter.post(
  "/confirm-email",
  validateRequest(confirmEmailSchema),
  asyncHandler(AuthController.confirmEmail)
);

// Route for resending confirmation code, usable for only sign up code
authRouter.post(
  "/resend-confirmation-code",
  validateRequest(resendConfirmationCodeSchema),
  asyncHandler(AuthController.resendConfirmationCode)
);

// Route for sign in
authRouter.post("/sign-in", validateRequest(signInSchema), asyncHandler(AuthController.signIn));

// Route for forgot password
authRouter.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  asyncHandler(AuthController.forgotPassword)
);

// Route for reseting password
authRouter.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  asyncHandler(AuthController.resetPassword)
);

// // Route for giving refresh token (require refresh token from cookie - consider a middleware to check?)
// authRouter.post("/refresh-token");
