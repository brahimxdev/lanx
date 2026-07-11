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

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];
