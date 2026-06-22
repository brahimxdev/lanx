import type { Request, Response, NextFunction } from "express";
import { db } from "@/store.js";
import { AppError } from "@/errors/AppError.js";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Get header from client body
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Authorization header missing or malformed");
  }

  // Grab accessToken from authHeader
  const accessToken = authHeader.replace("Bearer ", "");

  if (!accessToken) {
    throw AppError.unauthorized("Token is missing");
  }

  // Check if user exists
  const user = db.users.find((user) => user.id === accessToken);

  if (!user) {
    throw AppError.unauthorized("Authentication failed");
  }

  const { password: _password, ...safeUser } = user;
  req.user = safeUser;
  next();
};
