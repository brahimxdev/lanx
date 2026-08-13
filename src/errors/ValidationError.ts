import { ErrorName, AppError, HttpStatus, ErrorCode } from "./index.js";

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
