import { HttpStatus, type HttpStatusCode } from "./http-status.js";
import { ErrorCode, ErrorName, type ErrorCodeType, type ErrorNameType } from "./error-codes.js";

export class AppError extends Error {
  override name: ErrorNameType;
  readonly statusCode: HttpStatusCode;
  readonly code: ErrorCodeType;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(
    name: ErrorNameType,
    statusCode: HttpStatusCode,
    code: ErrorCodeType,
    message: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // 4xx Client Errors

  static badRequest(
    message: string,
    code: ErrorCodeType = ErrorCode.TOO_MANY_REQUESTS,
    details?: unknown
  ): AppError {
    return new AppError(ErrorName.BadRequest, HttpStatus.BadRequest, code, message, true, details);
  }

  static unauthorized(
    message = "Authentication required",
    code: ErrorCodeType = ErrorCode.UNAUTHORIZED
  ): AppError {
    return new AppError(ErrorName.Unauthorized, HttpStatus.Unauthorized, code, message);
  }

  static forbidden(
    message = "You do not have permission to perform this action",
    code: ErrorCodeType = ErrorCode.FORBIDDEN
  ): AppError {
    return new AppError(ErrorName.Forbidden, HttpStatus.Forbidden, code, message);
  }

  static notFound(message: string, code: ErrorCodeType = ErrorCode.NOT_FOUND): AppError {
    return new AppError(ErrorName.NotFound, HttpStatus.NotFound, code, message);
  }

  static conflict(message: string, code: ErrorCodeType = ErrorCode.ALREADY_EXISTS): AppError {
    return new AppError(ErrorName.Conflict, HttpStatus.Conflict, code, message);
  }

  static unprocessableEntity(
    message: string,
    code: ErrorCodeType = ErrorCode.VALIDATION_ERROR,
    details?: unknown
  ): AppError {
    return new AppError(
      ErrorName.UnprocessableEntity,
      HttpStatus.UnprocessableEntity,
      code,
      message,
      true,
      details
    );
  }

  static tooManyRequests(
    message = "Too many requests. Please try again later.",
    code: ErrorCodeType = ErrorCode.TOO_MANY_REQUESTS
  ): AppError {
    return new AppError(ErrorName.TooManyRequests, HttpStatus.TooManyRequests, code, message);
  }

  // ─── 5xx ──────────────────────────────────────────────────────────────────

  static internalServerError(message = "Internal Server Error"): AppError {
    return new AppError(
      ErrorName.InternalServerError,
      HttpStatus.InternalServerError,
      ErrorCode.INTERNAL_ERROR,
      message,
      false
    );
  }

  static badGateway(message = "Bad gateway"): AppError {
    return new AppError(
      ErrorName.BadGateway,
      HttpStatus.BadGateway,
      ErrorCode.INTERNAL_ERROR,
      message,
      false
    );
  }

  static serviceUnavailable(message = "Service temporarily unavailable"): AppError {
    return new AppError(
      ErrorName.ServiceUnavailable,
      HttpStatus.ServiceUnavailable,
      ErrorCode.INTERNAL_ERROR,
      message,
      false
    );
  }

  static gatewayTimeout(message = "Gateway timeout"): AppError {
    return new AppError(
      ErrorName.GatewayTimeout,
      HttpStatus.GatewayTimeout,
      ErrorCode.INTERNAL_ERROR,
      message,
      false
    );
  }
}
