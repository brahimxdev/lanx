import { AppError } from "@/errors/AppError.js";
import { ErrorCode } from "@/errors/error-codes.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";
import { authUserRepository } from "@/modules/auth/repo/index.js";
import { TokenService } from "@/modules/auth/token.service.js";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Grab header from req body
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    const err = AppError.unauthorized(
      "Authorization header missing or malinformed",
      ErrorCode.UNAUTHORIZED
    );
    next(err);
    return;
  }

  // Extract access token from header
  const accessToken = authHeader.slice("Bearer ".length).trim();

  if (!accessToken) {
    const err = AppError.unauthorized("You're not logged in", ErrorCode.UNAUTHORIZED);
    next(err);
    return;
  }

  // Verify the token
  let decodedToken;
  try {
    decodedToken = TokenService.verifyAcesssToken(accessToken);
  } catch (jwtError) {
    if (jwtError instanceof jwt.TokenExpiredError) {
      const err = AppError.unauthorized("Token expired", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    if (jwtError instanceof jwt.JsonWebTokenError) {
      const err = AppError.unauthorized("Invalid token", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    const err = AppError.unauthorized("Token verification failed", ErrorCode.UNAUTHORIZED);
    next(err);
    return;
  }

  // Check if the user exists by id
  const existingUser = await authUserRepository.findById(decodedToken.userId);

  if (!existingUser) {
    const err = AppError.unauthorized("Authentication failed", ErrorCode.UNAUTHORIZED);
    next(err);
    return;
  }

  // Attach user to the request object
  const user: IAuthenticatedUser = {
    id: existingUser.id,
    email: existingUser.email,
    isEmailVerified: existingUser.isEmailVerified,
    createdAt: existingUser.createdAt,
  };

  req.user = user;
  next();
};
