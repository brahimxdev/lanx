import express from "express";
import morgan from "morgan";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "@/errors/AppError.js";
import { isDev } from "./config/app-env.js";
import { authRouter } from "@/modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import { accountRouter } from "@/modules/account/account.routes.js";
import { lookupRouter } from "@/modules/lookup/lookup.routes.js";
import { profileRouter } from "@/modules/profile/profile.routes.js";
import { ensureDeviceId } from "./middlewares/ensureDeviceId.js";
import { rateLimit } from "./middlewares/rateLimiter.js";

const app = express();

// Global logging middleware
if (isDev) {
  app.use(morgan("dev"));
}

// Rate Limit
app.use(rateLimit("default"));

// Deserialize all coming request data into json
app.use(express.json());

// cookie parser
app.use(cookieParser());
app.use(ensureDeviceId);

// Mouting Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/account", accountRouter);
app.use("/api/v1/lookup", lookupRouter);
app.use("/api/v1/profile", profileRouter);

// Catch all routes and display 404 for not matched route
app.use((req: Request, _res: Response, _next: NextFunction) => {
  throw AppError.notFound(`Can't find ${req.originalUrl} on this server`);
});

// Global error middleware
app.use(errorHandler);

export default app;
