import { type ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "@/errors/index.js";
import { ErrorName } from "@/errors/error-codes.js";
import { HttpStatus } from "@/errors/index.js";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allIssues: { field: string; message: string }[] = [];
    const validated: { body?: unknown; query?: unknown; params?: unknown } = {};

    const targets = ["body", "query", "params"] as const;

    for (const target of targets) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(req[target]);

      if (!result.success) {
        const issues = result.error.issues.map((issue) => ({
          field: issue.path.join(".") || target,
          message: issue.message,
        }));
        allIssues.push(...issues);
      } else {
        validated[target] = result.data;
      }
    }

    if (allIssues.length > 0) {
      next(new ValidationError(allIssues));
      return;
    }

    req.validated = validated as { body: unknown; query: unknown; params: unknown };
    next();
  };
};

export class ValidationError extends AppError {
  constructor(public issues: { field: string; message: string }[]) {
    super(
      ErrorName.ValidationError,
      HttpStatus.UnprocessableEntity,
      ErrorCode.VALIDATION_ERROR,
      "Validation failed",
      true,
      issues
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
