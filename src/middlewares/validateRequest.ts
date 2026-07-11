import { ErrorName } from './../errors/error-codes.js';
import type { Request, Response, NextFunction } from "express";
import { type ZodType } from "zod";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";



type RequestPart = "body" | "query" | "params";

export const validateRequest =
  (schema: ZodType, part: RequestPart = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      // collect every validation error into a clean array
      const issues = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      // throw a validation error - error middleware handles the response
      const err = new ValidationError(issues);
      next(err);
      return;
    }

    // replace req.body/query/params with the parsed, typed, cleaned data
    // (this is important — Zod transforms like .trim() and .toLowerCase()
    // only persist if you save the parsed result back)
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };

// custom error class for validation - extends AppError so error handler picks it up
export class ValidationError extends AppError {
  constructor(public issues: { field: string; message: string }[]) {
    super(ErrorName.ValidationError, HttpStatus.UnprocessableEntity, ErrorCode.VALIDATION_ERROR, "Validation failed", true, issues);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
