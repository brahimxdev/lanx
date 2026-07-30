import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "@/errors/index.js";
import { ValidationError } from "./validateRequest.js";
import { appConfig } from "@/config/index.js";

// the error handler middleware — always register this LAST in server.ts
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (appConfig.nodeEnv !== "staging") {
    console.error(`[ERROR] {${new Date().toISOString()}} ${req.method} ${req.url}:`);
    console.error(err);
  }

  // Malformed JSON body (thrown by express.json() body-parser, before it reaches routes)
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    const badRequest = AppError.badRequest(
      "Malformed JSON in request body",
      ErrorCode.VALIDATION_ERROR
    );
    res.status(badRequest.statusCode).json({
      status: false,
      error: {
        code: badRequest.code,
        name: badRequest.name,
        message: badRequest.message,
        statusCode: badRequest.statusCode,
      },
    });
    return;
  }

  // Validation error
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      status: false,
      code: err.code,
      name: err.name,
      message: err.message,
      issues: err.issues,
    });
    return;
  }

  // EXPECTED ERRORS (AppError)
  // these are errors thrown on purpose - safe to send to client
  if (err instanceof AppError && err.isOperational) {
    const body: Record<string, unknown> = {
      status: false,
      error: {
        code: err.code,
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
      code: fallback.code,
      name: fallback.name,
      message: fallback.message,
      statusCode: fallback.statusCode,
    },
  });
};
