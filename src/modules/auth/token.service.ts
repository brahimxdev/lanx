import { authConfig } from "@/config/index.js";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import type { Response, Request } from "express";

export interface IAccessTokenClaims {
  userId: string;
  roles?: string[];
  sessionId: string;
}

export interface IAccessTokenPayload extends IAccessTokenClaims {
  iat: number;
  exp: number;
}

export interface IRefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export class TokenService {
  // Sign access Token
  static signAccessToken(claims: IAccessTokenClaims): string {
    const accessToken = jwt.sign(claims, authConfig.jwtSecret, {
      algorithm: authConfig.jwtAlg,
      expiresIn: authConfig.jwtExpiresIn,
    });

    return accessToken;
  }

  // Verify access Token
  static verifyAcesssToken(token: string): IAccessTokenPayload {
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
    res.clearCookie(authConfig.refreshCookieName, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: authConfig.refreshTokenTTL, // 7 days in ms
    });
  }

  // get refresh token from cookie
  static getRefreshTokenFromCookie(req: Request): string | null {
    const raw: unknown = req.cookies.refreshToken;
    console.log("You refresh Token from cookie:", raw);
    return typeof raw === "string" ? raw : null;
  }
}
