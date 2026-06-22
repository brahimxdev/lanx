export const HttpStatus = {
  // 2xx
  OK: 200,
  Created: 201,
  Accepted: 202,
  NoContent: 204,

  // 3xx
  MovedPermanently: 301,
  Found: 302,
  NotModified: 304,
  TemporaryRedirect: 307,

  // 4xx
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  UnprocessableEntity: 422,
  TooManyRequests: 429,

  // 5xx
  InternalServerError: 500,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
} as const;

/**
 * ERROR NAMES — string identifiers for 4xx and 5xx only.
 * (2xx and 3xx aren't errors, so they don't get names.)
 *
 *   if (err.name === ErrorName.Unauthorized) redirectToLogin();
 */
export const ErrorName = {
  // 4xx
  BadRequest: "BadRequest",
  Unauthorized: "Unauthorized",
  Forbidden: "Forbidden",
  NotFound: "NotFound",
  Conflict: "Conflict",
  UnprocessableEntity: "UnprocessableEntity",
  TooManyRequests: "TooManyRequests",

  // 5xx
  InternalServerError: "InternalServerError",
  BadGateway: "BadGateway",
  ServiceUnavailable: "ServiceUnavailable",
  GatewayTimeout: "GatewayTimeout",

  // App Error
  ValidationError: "Validation Error",
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];
export type ErrorNameType = (typeof ErrorName)[keyof typeof ErrorName];

export class AppError extends Error {
  override name: ErrorNameType;
  readonly statusCode: HttpStatusCode;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(
    name: ErrorNameType,
    statusCode: HttpStatusCode,
    message: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // 4xx Client Errors

  static badRequest(message: string, details?: unknown): AppError {
    const err = new AppError(ErrorName.BadRequest, HttpStatus.BadRequest, message, true, details);
    return err;
  }

  static unauthorized(message = "Authentication required"): AppError {
    const err = new AppError(ErrorName.Unauthorized, HttpStatus.Unauthorized, message);
    return err;
  }

  static forbidden(message = "You do not have permission to perform this action"): AppError {
    const err = new AppError(ErrorName.Forbidden, HttpStatus.Forbidden, message);
    return err;
  }

  static notFound(message: string): AppError {
    const err = new AppError(ErrorName.NotFound, HttpStatus.NotFound, message);
    return err;
  }

  static conflict(message: string): AppError {
    const err = new AppError(ErrorName.Conflict, HttpStatus.Conflict, message);
    return err;
  }

  static unprocessableEntity(message: string, details?: unknown): AppError {
    const err = new AppError(
      ErrorName.UnprocessableEntity,
      HttpStatus.UnprocessableEntity,
      message,
      true,
      details
    );
    return err;
  }

  static tooManyRequests(message = "Too many requests. Please try again later."): AppError {
    const err = new AppError(ErrorName.TooManyRequests, HttpStatus.TooManyRequests, message);
    return err;
  }

  // 5xx Server Errors
  // isOperational = false → never expose these details to the client

  static internalServerError(message = "Internal Server Error"): AppError {
    const err = new AppError(
      ErrorName.InternalServerError,
      HttpStatus.InternalServerError,
      message,
      false
    );
    return err;
  }

  static badGateway(message = "Bad gateway"): AppError {
    const err = new AppError(ErrorName.BadGateway, HttpStatus.BadGateway, message, false);
    return err;
  }

  static serviceUnavailable(message = "Service temporarily unavailable"): AppError {
    const err = new AppError(
      ErrorName.ServiceUnavailable,
      HttpStatus.ServiceUnavailable,
      message,
      false
    );
    return err;
  }

  static gatwayTimeOut(message = "Gateway timeout"): AppError {
    const err = new AppError(ErrorName.GatewayTimeout, HttpStatus.GatewayTimeout, message, false);
    return err;
  }
}
