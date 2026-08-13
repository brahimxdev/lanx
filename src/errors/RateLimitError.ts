import { ErrorName, AppError, HttpStatus, ErrorCode } from "./index.js";

export class RateLimitError extends AppError {
  constructor(public retryAfterSeconds: number) {
    super(
      ErrorName.TooManyRequests,
      HttpStatus.TooManyRequests,
      ErrorCode.TOO_MANY_REQUESTS,
      "Too many requests. Please try again later.",
      true,
      retryAfterSeconds
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
