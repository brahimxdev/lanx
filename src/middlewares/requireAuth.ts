import type { Request, Response, NextFunction } from "express";
import { db } from "@/store.js";
import { AppError } from "@/errors/AppError.js";
import { authConfig } from "@/config/index.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // // Get header from client body
  // const authHeader = req.headers.authorization;

  // // Check if header exsits and has the right shape
  // if (!authHeader?.startsWith("Bearer ")) {
  //   const err = AppError.unauthorized("Authorization header missing or malformed");
  //   next(err);
  //   return;
  // }

  // // Grab accessToken from authHeader
  // const accessToken = authHeader.split(" ")[1];

  // Grab token from cooks
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    throw AppError.unauthorized("Token missing");
  }

  try {
    // Verify the token
    const payload = jwt.verify(accessToken, authConfig.jwtSecret) as JwtPayload;
    // Check if user exists in db
    const user = db.users.find((user) => user.id === payload.id);

    if (!user) {
      throw AppError.unauthorized("Authentication failed");
    }

    // Attach user to req
    const { passwordHash: _, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch {
    const err = AppError.unauthorized("Invalid or expired token");
    next(err);
    return;
  }
};
