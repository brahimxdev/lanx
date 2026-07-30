import { requireAuth } from "@/middlewares/requireAuth.js";
import { asyncHandler, asyncBodyHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { profileController } from "./profile.module.js";
import { validateRequest } from "@/middlewares/validateRequest.js";
import { createProfileSchema, updateProfileSchema } from "./profile.validation.js";

export const profileRouter = Router();

// base url - /api/v1/profile

// apply requireAuth to all profile routes
profileRouter.use(requireAuth);

// Route to fetch loggedin user profile details - (need auth access)
profileRouter.get("/", asyncHandler(profileController.getProfile));

// Route to create profile one-time on onboarding
profileRouter.post(
  "/",
  validateRequest({ body: createProfileSchema }),
  asyncBodyHandler(profileController.createProfile)
);

//  Route to update profile
profileRouter.patch(
  "/",
  validateRequest({ body: updateProfileSchema }),
  asyncBodyHandler(profileController.updateProfile)
);
