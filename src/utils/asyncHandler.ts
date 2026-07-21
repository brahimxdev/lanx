import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { TypedRequest } from "@/types/typed-request.js";

// The async function signature handlers will use
type AsyncHandlerFn<TQuery = unknown, TBody = unknown, TParams = unknown> = (
  req: TypedRequest<TQuery, TBody, TParams>,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Core wrapper — catches anything thrown or rejected, passes to next()
export const asyncHandler = <TQuery = unknown, TBody = unknown, TParams = unknown>(
  fn: AsyncHandlerFn<TQuery, TBody, TParams>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as TypedRequest<TQuery, TBody, TParams>, res, next).catch(next);
  };
};

// Convenience aliases — mirrors TypedRequest aliases
export const asyncBodyHandler = <TBody>(fn: AsyncHandlerFn<unknown, TBody>): RequestHandler =>
  asyncHandler<unknown, TBody>(fn);

export const asyncQueryHandler = <TQuery>(fn: AsyncHandlerFn<TQuery>): RequestHandler =>
  asyncHandler<TQuery>(fn);

export const asyncParamsHandler = <TParams>(
  fn: AsyncHandlerFn<unknown, unknown, TParams>
): RequestHandler => asyncHandler<unknown, unknown, TParams>(fn);
