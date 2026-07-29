import { requireAuth } from "@/middlewares/requireAuth.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { lookupController } from "./lookup.module.js";

export const lookupRouter = Router();

// base url - /api/v1/lookup

// Route for listing all countries
lookupRouter.get("/countries", asyncHandler(lookupController.listCountries));

// // Route for listing all currencies
// lookupRouter.get("/currencies");

// // Route for listing all professions
// lookupRouter.get("/professions");

// // Route for creating profession - (need auth access)
// lookupRouter.post("/professions", requireAuth);
