import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const DEVICE_ID_COOKIE = "deviceId";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const ensureDeviceId = (req: Request, res: Response, next: NextFunction): void => {
  let deviceId = req.cookies[DEVICE_ID_COOKIE] as string | undefined;

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    res.cookie(DEVICE_ID_COOKIE, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ONE_YEAR_MS,
    });
  }

  req.deviceId = deviceId;
  next();
};
