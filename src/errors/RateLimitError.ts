export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}
