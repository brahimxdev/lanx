import { requireAuth } from "@/middlewares/requireAuth.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { AccountController } from "./account.controller.js";
import { validateRequest } from "@/middlewares/validateRequest.js";
import {
  changeEmailSchema,
  changePasswordSchema,
  confirmChangeEmailSchema,
} from "./account.validation.js";

export const accountRouter = Router();

// apply requireAuth to all account routes
accountRouter.use(requireAuth);

// base url - /api/v1/account

// Route for changing password in dashboard - (need auth access)
accountRouter.patch(
  "/password",
  validateRequest(changePasswordSchema),
  asyncHandler(AccountController.changePassword)
);

// Route for requesting email change in dashboard - (need auth access)
accountRouter.post(
  "/email",
  validateRequest(changeEmailSchema),
  asyncHandler(AccountController.changeEmail)
);

// Route for confirming email change in dashboard - (need auth access)
accountRouter.post(
  "/email/confirm",
  validateRequest(confirmChangeEmailSchema),
  asyncHandler(AccountController.confirmEmailChange)
);

// // Route for logout - (already authenticated, not necessarily protected route)
// accountRouter.post("/logout");

// // Route for listing all active sessions for a user (need auth access)
// accountRouter.get("/sessions");

// // Route for revoking a session by user (need auth access)
// accountRouter.delete("/sessions/:id");

// // Route to fetch loggedin profile details - (need auth access)
// accountRouter.get("/");

// // Route to delete loggedin user - (need auth acccess)
// accountRouter.delete("/");

// // Route to update loggedin user profile details - (need auth access)
// accountRouter.patch("/");
