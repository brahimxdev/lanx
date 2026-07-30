import { asyncHandler, asyncQueryHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { lookupController } from "./lookup.module.js";
import { validateRequest } from "@/middlewares/validateRequest.js";
import {
  listCountriesSchema,
  listCurrenciesSchema,
  listProfessionsSchema,
} from "./lookup.validation.js";

export const lookupRouter = Router();

// base url - /api/v1/lookup

// Route for listing all countries
lookupRouter.get(
  "/countries",
  validateRequest({ query: listCountriesSchema }),
  asyncHandler(lookupController.listCountries)
);

// Route for listing all currencies
lookupRouter.get(
  "/currencies",
  validateRequest({ query: listCurrenciesSchema }),
  asyncHandler(lookupController.listCurrencies)
);

// Route for listing all professions
lookupRouter.get(
  "/professions",
  validateRequest({ query: listProfessionsSchema }),
  asyncQueryHandler(lookupController.listProfessions)
);

// // Route for creating profession - (need auth access)
// lookupRouter.post("/professions", requireAuth);
