import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { AppError, HttpStatus } from "@/errors/AppError.js";
import { registerSchema, loginSchema } from "@/schemas/auth.schema.js";
import { authService } from "@/services/auth.service.js";

// POST - /api/v1/auth/register
export const authController = {
  register: asyncHandler((req: Request, res: Response) => {
    // 1. Validate input
    const request = registerSchema.safeParse(req.body);

    if (!request.success) {
      const errorMessage = request.error.issues[0]?.message ?? "Invalid input";
      throw AppError.badRequest(
        errorMessage,
        "The input field you provided doesn't follow the sepecified shape, please check API doc"
      );
    }

    // 2. Use the auth service to create account based on request input
    const { newUser } = authService.createAccount(request.data);

    res.status(HttpStatus.Created).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  }),

  // POST - /api/v1/auth/login
  login: asyncHandler((req: Request, res: Response, _next: NextFunction) => {
    // 1. Validate input
    const request = loginSchema.safeParse(req.body);

    if (!request.success) {
      const errorMessage = request.error.issues[0]?.message ?? "Invalid input";
      throw AppError.badRequest(
        errorMessage,
        "The input field you provided doesn't follow the sepecified shape, please check API doc"
      );
    }

    // 2. User auth service for login
    const { accessToken, user } = authService.login(request.data);

    // Temporary: using user ID as the access token until JWT is introduced
    // 2xx - success responses (use HttpStatus.X with res.status())
    res.status(HttpStatus.OK).json({
      status: "success",
      data: {
        accessToken,
        user,
      },
    });
  }),
};
