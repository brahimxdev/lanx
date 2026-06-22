import express from "express";
import morgan from "morgan";
import type { Request, Response, NextFunction } from "express";
import { isDev } from "./config/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "@/errors/AppError.js";
// import { router as authRouter } from "@/routes/auth.routes.js";
// import { router as postRouter } from "@/routes/post.routes.js";
// import { router as userRouter } from "@/routes/user.routes.js";

const app = express();

// Global middleware
if (isDev) {
  app.use(morgan("dev"));
}
app.use(express.json());



app.use((req: Request, _res: Response, _next: NextFunction) => {
  throw AppError.notFound(req.originalUrl);
});

app.use(errorHandler);

export default app;
