import type { Request, Response, NextFunction } from "express";
import { AppError, HttpStatus } from "@/errors/AppError.js";
import { env } from "@/config/env.js";

// the error handler middleware — always register this LAST in server.ts
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (env.NODE_ENV !== "staging") {
    console.error(`[ERROR] {${new Date().toISOString()}} ${req.method} ${req.url}:`);
    console.error(err);
  }

  // EXPECTED ERRORS (AppError)
  // these are errors YOU threw on purpose - safe to send to client
  if (err instanceof AppError && err.isOperational) {
    const body: Record<string, unknown> = {
      status: "error",
      error: {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
      },
    };

    if (err.details !== undefined) {
      (body.error as Record<string, unknown>).details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // UNEXPECTED ERRORS (bugs, crashes)
  const fallback = AppError.internalServerError();
  res.status(fallback.statusCode).json({
    error: {
      name: fallback.name,
      message: fallback.message,
      statusCode: fallback.statusCode,
    },
  });
};
