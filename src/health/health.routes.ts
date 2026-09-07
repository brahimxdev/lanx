import { asyncHandler } from "@/utils/asyncHandler.js";
import { Router } from "express";
import { healthController } from "./health.module.js";

export const healthRouter = Router();

healthRouter.get("/live", asyncHandler(healthController.live));

healthRouter.get("/ready", asyncHandler(healthController.ready));
