import express from "express";
import morgan from "morgan";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "@/errors/AppError.js";
import { isDev } from "./config/app-env.js";
import { router as authRouter } from "./routes/auth.routes.js";
import { router as userRouter } from "./routes/user.routes.js";

const app = express();

// Global logging middleware
if (isDev) {
  app.use(morgan("dev"));
}
// Deserialize all coming request data into json
app.use(express.json());

// Mouting Routes
app.use("/api/v1/auth", authRouter);
// app.use("api/v1/users", userRouter);

// Catch all routes and display 404 for not matched route
app.use((req: Request, _res: Response, _next: NextFunction) => {
  throw AppError.notFound(`Can't find ${req.originalUrl} on this server`);
});

// Global error middleware
app.use(errorHandler);

export default app;
