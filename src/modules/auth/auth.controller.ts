import { HttpStatus } from "@/errors/index.js";
import type { IConfirmEmail, IResendConfirmationCode, ISignupInput } from "./auth.validation.js";
import { AuthService } from "./auth.service.js";
import type { Request, Response } from "express";
import type { IRequestMeta } from "./auth.types.js";
import { TokenService } from "./token.service.js";

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
    TokenService.setRefreshTokenCookie(res, refreshToken);

    res.status(HttpStatus.Created).json({
      status: "true",
      data: {
        user: newUser,
        accessToken,
      },
    });
  };

  // resend confirmation code - usable for signup
  static resendConfirmationCode = async (
    req: Request<unknown, unknown, IResendConfirmationCode>,
    res: Response
  ) => {
    // Validation middleware already validated data!
    const { email } = req.body;

    const { message } = await AuthService.resendConfirmationCode({ email });

    res.status(HttpStatus.OK).json({
      status: "true",
      data: {
        message,
      },
    });
  };
}
