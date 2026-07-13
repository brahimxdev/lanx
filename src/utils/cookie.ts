import { authConfig } from "@/config/index.js";
import type { Response } from "express";

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(authConfig.refreshCookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: authConfig.refreshTokenTTL, // 7 days in ms
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(authConfig.refreshCookieName, {path: "/api/auth"});
};
