import { Router } from "express";
import { validateRequest } from "@/middlewares/validateRequest.js";
import {
  confirmEmailSchema,
  resendConfirmationCodeSchema,
  signUpSchema,
} from "./auth.validation.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { AuthController } from "./auth.controller.js";

export const router = Router();

// base url - /api/v1/auth

// Route for creating user
router.post("/sign-up", validateRequest(signUpSchema), asyncHandler(AuthController.signup));

// Route for confirming email, usable for only sign up to confirm email by code
router.post(
  "/confirm-email",
  validateRequest(confirmEmailSchema),
  asyncHandler(AuthController.confirmEmail)
);

// Route for resending confirmation code, usable for only sign up code
router.post(
  "/resend-confirmation-code",
  validateRequest(resendConfirmationCodeSchema),
  asyncHandler(AuthController.resendConfirmationCode)
);

// // Route for login
// router.post("/login");

// // Route for forgot password
// router.post("/forgot-password");

// // Route for reseting passwordd
// router.post("/reset-password");

// // Route for changing password - (need auth access)
// router.post("/change-password");

// // Route for changing email - (need auth access)
// router.post("/change-email");

// // Route for logout - (already authenticated, not necessarily protected route)
// router.post("/logout");

// // Route for listing all active sessions for a user (need auth access)
// router.get("/sessions");

// // Route for revoking a session by user (need auth access)
// router.delete("/sessions/:id");

// // Route for giving refresh token (require refresh token from cookie - consider a middleware to check?)
// router.post("/refresh-token");
