import express from "express";
import morgan from "morgan";
import type { Request, Response, NextFunction } from "express";
import { isDev } from "./config/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "@/errors/AppError.js";
// import { router as authRouter } from "@/routes/auth.routes.js";

const app = express();

// Global logging middleware
if (isDev) {
  app.use(morgan("dev"));
}
// Deserialize all coming request data into json
app.use(express.json());

// Mouting Routes
// app.use("/api/v1/auth", authRouter);

// Catch all routes and display 404 for not matched route
app.use((req: Request, _res: Response, _next: NextFunction) => {
  throw AppError.notFound(`Can't find ${req.originalUrl} on this server`);
});

// Global error middleware
app.use(errorHandler);

export default app;
