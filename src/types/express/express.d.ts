import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: IAuthenticatedUser;
      sessionId?: string;
      validated?: {
        body: unknown;
        query: unknown;
        params: unknown;
      };
    }
  }
}

export {};
