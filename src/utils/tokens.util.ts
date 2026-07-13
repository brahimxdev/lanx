import { authConfig } from "@/config/index.js";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";

export interface IAccessTokenPayload {
  userId: string;
  roles?: string[];
  sessionId: string;
}

export interface IRefreshTokenPayload {
  userId: string;
  sessionId: string;
}

// Sign access Token
export const signAccessToken = (payload: IAccessTokenPayload): string => {
  const accessToken = jwt.sign(payload, authConfig.jwtSecret, {
    algorithm: authConfig.jwtAlg,
    expiresIn: authConfig.jwtExpiresIn,
  });

  return accessToken;
};

// Verify access Token
export const verifyAccessToken = (token: string): IAccessTokenPayload => {
  return jwt.verify(token, authConfig.jwtSecret, {
    algorithms: [authConfig.jwtAlg],
  }) as IAccessTokenPayload;
};

// Generate refresh Token
export const generateRefreshToken = (): string => {
  const refreshTokenString = randomBytes(48).toString("base64url");
  return refreshTokenString;
};

export const hashRefreshToken = (token: string): string => {
  const hashedRefreshToken = createHash("sha256").update(token).digest("hex");
  return hashedRefreshToken;
};
