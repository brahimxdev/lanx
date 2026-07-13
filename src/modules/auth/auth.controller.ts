import { HttpStatus } from "@/errors/index.js";
import type { IConfirmEmail, ISignupInput } from "./auth.validation.js";
import { AuthService } from "./auth.service.js";
import type { Request, Response } from "express";
import type { IRequestMeta } from "./auth.types.js";
import { setRefreshTokenCookie } from "@/utils/cookie.js";

// POST - /api/v1/auth/sign-up

export class AuthController {
  // sign-up - create new account on auth_users table
  static signup = async (req: Request<unknown, unknown, ISignupInput>, res: Response) => {
    // Validation middleware already validated data!

    const { email, password } = req.body;

    const { newUser } = await AuthService.createUser({ email, password });

    res.status(HttpStatus.Created).json({
      status: "true",
      data: { user: newUser },
    });
  };

  // confirm-email - confirm user email by code provided
  static confirmEmail = async (req: Request<unknown, unknown, IConfirmEmail>, res: Response) => {
    // Validation middleware already validated data!
    const { email, confirmationCode } = req.body;

    const { newUser, accessToken, refreshToken } = await AuthService.confirmEmail(
      { email, confirmationCode },
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
    );

    // set refresh token to cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(HttpStatus.Created).json({
      status: "true",
      data: {
        user: newUser,
        accessToken,
      },
    });
  };
}
