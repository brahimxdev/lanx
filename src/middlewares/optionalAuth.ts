import { AppError } from "@/errors/AppError.js";
import { ErrorCode } from "@/errors/error-codes.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";
import { authUserRepository, sessionRespository } from "@/shared/repo/index.js";
import { TokenService } from "@/modules/auth/token.service.js";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Grab header from req body
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  // Extract access token from header
  const accessToken = authHeader.slice("Bearer ".length).trim();

  if (!accessToken) {
    next();
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

  // Reject tokens issued before the last password change
  if (existingUser.passwordChangedAt) {
    const passwordChangedAtTimestamp = Math.floor(existingUser.passwordChangedAt.getTime() / 1000);

    if (decodedToken.iat < passwordChangedAtTimestamp) {
      const err = AppError.unauthorized(
        "Session invalidated due to password change, please sign in again",
        ErrorCode.UNAUTHORIZED
      );
      next(err);
      return;
    }
  }

  // Check if the session tied to the token is still active
  const activeSession = await sessionRespository.findActiveById(decodedToken.sessionId);

  if (!activeSession) {
    const err = AppError.unauthorized(
      "Session has been revoked, please sign in",
      ErrorCode.UNAUTHORIZED
    );
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
  req.sessionId = decodedToken.sessionId;
  next();
};
