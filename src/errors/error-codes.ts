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
  ValidationError: "ValidationError",
} as const;

// Application-level error codes
// These are the stable contracts the frontend checks against.
// Never rename a code once the frontend depends on it.
export const ErrorCode = {
  // Auth
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_TOKEN: "INVALID_TOKEN",
  EXPIRED_TOKEN: "EXPIRED_TOKEN",
  ALREADY_VERIFIED: "ALREADY_VERIFIED",
  INVALID_CODE: "INVALID_CODE",
  EXPIRED_CODE: "EXPIRED_CODE",
  CODE_ALREADY_USED: "CODE_ALREADY_USED",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Permissions
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",

  // Rate limiting
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorNameType = (typeof ErrorName)[keyof typeof ErrorName];
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
