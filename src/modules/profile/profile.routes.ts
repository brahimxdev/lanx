import { requireAuth } from "@/middlewares/requireAuth.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { profileController } from "./profile.module.js";

export const profileRouter = Router();

// base url - /api/v1/profile

// apply requireAuth to all profile routes
profileRouter.use(requireAuth);

// Route to fetch loggedin user profile details - (need auth access)
profileRouter.get("/", asyncHandler(profileController.getProfile));
