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
import { asyncBodyHandler } from "@/utils/asyncHandler.js";
import { authController } from "./auth.module.js";

export const authRouter = Router();

// base url - /api/v1/auth

// Route for creating user
authRouter.post(
  "/sign-up",
  validateRequest({ body: signUpSchema }),
  asyncBodyHandler(authController.signup)
);

// Route for confirming email, usable for only sign up to confirm email by code
authRouter.post(
  "/confirm-email",
  validateRequest({ body: confirmEmailSchema }),
  asyncBodyHandler(authController.confirmEmail)
);

// Route for resending confirmation code, usable for only sign up code
authRouter.post(
  "/resend-confirmation-code",
  validateRequest({ body: resendConfirmationCodeSchema }),
  asyncBodyHandler(authController.resendConfirmationCode)
);

// Route for sign in
authRouter.post(
  "/sign-in",
  validateRequest({ body: signInSchema }),
  asyncBodyHandler(authController.signIn)
);

// Route for forgot password
authRouter.post(
  "/forgot-password",
  validateRequest({ body: forgotPasswordSchema }),
  asyncBodyHandler(authController.forgotPassword)
);

// Route for reseting password
authRouter.post(
  "/reset-password",
  validateRequest({ body: resetPasswordSchema }),
  asyncBodyHandler(authController.resetPassword)
);

// Route for logout
authRouter.post("/logout", asyncBodyHandler(authController.logout));

// // Route for giving refresh token (require refresh token from cookie - consider a middleware to check?)
// authRouter.post("/refresh-token");
