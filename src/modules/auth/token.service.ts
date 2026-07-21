import { authConfig } from "@/config/index.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { Response, Request } from "express";
import { AppError, ErrorCode } from "@/errors/index.js";

// What you put IN when signing
export interface IAccessTokenClaims {
  userId: string;
  roles?: string[];
  sessionId: string;
}

// What you get OUT after verifying
export interface IAccessTokenPayload extends IAccessTokenClaims {
  iat: number;
  exp: number;
}

export interface IRefreshTokenPayload {
  userId: string;
  sessionId: string;
}

// Business/crypto logic
export interface ITokenService {
  generateRefreshToken(): string;
  hashRefreshToken(token: string): string;
  signAccessToken(claims: IAccessTokenClaims): string;
  verifyAccessToken(token: string): IAccessTokenPayload;
}

// Transport concern
export interface IAuthCookieService {
  setRefreshTokenCookie(res: Response, token: string): void;
  clearRefreshTokenCookie(res: Response): void;
  getRefreshTokenFromCookie(req: Request): string;
}

export class TokenService implements ITokenService, IAuthCookieService {
  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  signAccessToken(claims: IAccessTokenClaims): string {
    return jwt.sign(claims, authConfig.jwtSecret, {
      algorithm: authConfig.jwtAlg,
      expiresIn: authConfig.jwtExpiresIn,
    });
  }

  verifyAccessToken(token: string): IAccessTokenPayload {
    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret, {
        algorithms: [authConfig.jwtAlg],
      });

      if (typeof decoded === "string") {
        throw AppError.unauthorized("Invalid access token", ErrorCode.INVALID_TOKEN);
      }

      return decoded as IAccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized("Access token expired", ErrorCode.EXPIRED_TOKEN);
      }

      if (err instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized("Invalid access token", ErrorCode.INVALID_TOKEN);
      }

      throw err;
    }
  }

  setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(authConfig.refreshCookieName, token, {
      httpOnly: true,
      secure: authConfig.isProduction,
      sameSite: "strict",
      path: authConfig.refreshCookiePath, // single source of truth
      maxAge: authConfig.refreshTokenTTL,
    });
  }

  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(authConfig.refreshCookieName, {
      httpOnly: true,
      secure: authConfig.isProduction,
      sameSite: "strict",
      path: authConfig.refreshCookiePath,
      maxAge: authConfig.refreshTokenTTL,
    });
  }

  getRefreshTokenFromCookie(req: Request): string {
    const raw: unknown = req.cookies[authConfig.refreshCookieName];

    if (typeof raw !== "string" || raw.length === 0) {
      throw AppError.unauthorized("Refresh token missing", ErrorCode.UNAUTHORIZED);
    }

    return raw;
  }
}

export const tokenService = new TokenService();
