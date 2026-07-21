import { requireAuth } from "@/middlewares/requireAuth.js";
import { asyncBodyHandler, asyncQueryHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { validateRequest } from "@/middlewares/validateRequest.js";
import {
  changeEmailSchema,
  changePasswordSchema,
  confirmChangeEmailSchema,
  listSessionSchema,
} from "./account.validation.js";
import { accountController } from "./account.module.js";

export const accountRouter = Router();

// apply requireAuth to all account routes
accountRouter.use(requireAuth);

// base url - /api/v1/account

// Route for changing password in dashboard - (need auth access)
accountRouter.patch(
  "/password",
  validateRequest({ body: changePasswordSchema }),
  asyncBodyHandler(accountController.changePassword)
);

// Route for requesting email change in dashboard - (need auth access)
accountRouter.post(
  "/email",
  validateRequest({ body: changeEmailSchema }),
  asyncBodyHandler(accountController.requestChangeEmail)
);

// Route for confirming email change in dashboard - (need auth access)
accountRouter.post(
  "/email/confirm",
  validateRequest({ body: confirmChangeEmailSchema }),
  asyncBodyHandler(accountController.confirmEmailChange)
);

// Route for listing all active sessions for a user (need auth access)
accountRouter.get(
  "/sessions",
  validateRequest({ query: listSessionSchema }),
  asyncQueryHandler(accountController.listSessions)
);

// // Route for revoking a session by user (need auth access)
// accountRouter.delete("/sessions/:id");

// // Route to fetch loggedin profile details - (need auth access)
// accountRouter.get("/");

// // Route to delete loggedin user - (need auth acccess)
// accountRouter.delete("/");

// // Route to update loggedin user profile details - (need auth access)
// accountRouter.patch("/");
