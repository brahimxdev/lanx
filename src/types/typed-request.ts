import type { Request } from "express";

export type TypedRequest<TQuery = unknown, TBody = unknown, TParams = unknown> = Request & {
  validated: {
    query: TQuery;
    body: TBody;
    params: TParams;
  };
};

// Convenience aliases
export type TypedBodyRequest<TBody> = TypedRequest<unknown, TBody>;
export type TypedQueryRequest<TQuery> = TypedRequest<TQuery>;
export type TypedParamsRequest<TParams> = TypedRequest<unknown, unknown, TParams>;
