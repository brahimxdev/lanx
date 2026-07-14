import { authConfig } from "@/config/index.js";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import type { Response } from "express";

export interface IAccessTokenPayload {
  userId: string;
  roles?: string[];
  sessionId: string;
}

export interface IRefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export class TokenService {
  // Sign access Token
  static signAccessToken(payload: IAccessTokenPayload) {
    const accessToken = jwt.sign(payload, authConfig.jwtSecret, {
      algorithm: authConfig.jwtAlg,
      expiresIn: authConfig.jwtExpiresIn,
    });

    return accessToken;
  }

  // Verify access Token
  static verifyAcessToken(token: string): IAccessTokenPayload {
    return jwt.verify(token, authConfig.jwtSecret, {
      algorithms: [authConfig.jwtAlg],
    }) as IAccessTokenPayload;
  }

  // Generate refresh Token
  static generateRefreshToken(): string {
    const refreshTokenString = randomBytes(48).toString("base64url");
    return refreshTokenString;
  }

  // Hash refresh Token
  static hashRefreshToken(token: string): string {
    const hashedRefreshToken = createHash("sha256").update(token).digest("hex");
    return hashedRefreshToken;
  }

  // Set refresh token to cookie
  static setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(authConfig.refreshCookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: authConfig.refreshTokenTTL, // 7 days in ms
    });
  }

  // Clear refresh token from cookie
  static clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(authConfig.refreshCookieName, { path: "/api/v1/auth" });
  }
}
