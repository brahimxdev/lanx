import { HttpStatus } from "@/errors/index.js";
import type {
  IConfirmEmail,
  IForgotPassword,
  IResendConfirmationCode,
  IResetPassword,
  ISignIn,
  ISignup,
} from "./auth.validation.js";
import type { AuthService } from "./auth.service.js";
import type { Request, Response } from "express";
import type { IAuthCookieService } from "./token.service.js";
import type { TypedBodyRequest } from "@/types/typed-request.js";
import type { IRequestMeta } from "@/modules/auth/index.js";

// POST - /api/v1/auth/sign-up

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: IAuthCookieService
  ) {}

  private extractMeta(req: Request): IRequestMeta {
    const getHeader = (val: string | string[] | undefined): string | null => {
      if (typeof val === "string") return val;
      if (Array.isArray(val)) return val[0] ?? null;
      return null;
    };

    return {
      ipAddress: req.ip ?? null,
      userAgent: getHeader(req.headers["user-agent"]),
      deviceType: getHeader(req.headers["x-device-type"]),
      deviceOs: getHeader(req.headers["x-device-os"]),
      deviceBrowser: getHeader(req.headers["x-device-browser"]),
    };
  }

  // sign-up - create new account on auth_users table
  signup = async (req: TypedBodyRequest<ISignup>, res: Response) => {
    //* Validation middleware already validated data!

    const { email, password } = req.validated.body;

    const { newUser } = await this.authService.createUser({ email, password });

    res.status(HttpStatus.Created).json({
      status: true,
      data: { user: newUser },
    });
  };

  // confirm-email - confirm user email by code provided
  confirmEmail = async (req: TypedBodyRequest<IConfirmEmail>, res: Response) => {
    // Validation middleware already validated data!
    const { email, confirmationCode } = req.validated.body;

    const { newUser, accessToken, refreshToken } = await this.authService.confirmEmail(
      { email, confirmationCode },
      this.extractMeta(req)
    );

    // set refresh token to cookie
    this.tokenService.setRefreshTokenCookie(res, refreshToken);

    res.status(HttpStatus.Created).json({
      status: true,
      data: {
        user: newUser,
        accessToken,
      },
    });
  };

  // Resend confirmation code - usable for signup
  resendConfirmationCode = async (
    req: TypedBodyRequest<IResendConfirmationCode>,
    res: Response
  ) => {
    // Validation middleware already validated data!
    const { email } = req.validated.body;

    const { message } = await this.authService.resendConfirmationCode({ email });

    res.status(HttpStatus.OK).json({
      status: true,
      data: {
        message,
      },
    });
  };

  // Sign in
  signIn = async (req: TypedBodyRequest<ISignIn>, res: Response) => {
    //* Validation middleware already validated data!
    const { email, password } = req.validated.body;

    const { user, accessToken, refreshToken } = await this.authService.signIn(
      { email, password },
      this.extractMeta(req)
    );

    // set refresh token to cookie
    this.tokenService.setRefreshTokenCookie(res, refreshToken);

    res.status(HttpStatus.OK).json({
      status: true,
      data: {
        user,
        accessToken,
      },
    });
  };

  // Forgot password
  forgotPassword = async (req: TypedBodyRequest<IForgotPassword>, res: Response) => {
    //* Validation middleware already validated data!
    const { email } = req.validated.body;

    const { message } = await this.authService.forgotPassword({ email });

    res.status(HttpStatus.OK).json({
      status: true,
      data: {
        message,
      },
    });
  };

  // Reset password
  resetPassword = async (req: TypedBodyRequest<IResetPassword>, res: Response) => {
    //* Validation middleware already validated data!

    const { email, confirmationCode, newPassword } = req.validated.body;

    const { message } = await this.authService.resetPassword({
      email,
      confirmationCode,
      newPassword,
    });

    res.status(HttpStatus.OK).json({
      status: true,
      data: {
        message,
      },
    });
  };

  // Logout user from current session - (need refresh token in cookie)
  logout = async (req: Request, res: Response) => {
    const refreshToken = this.tokenService.getRefreshTokenFromCookie(req);

    const { message } = await this.authService.logout(refreshToken);

    this.tokenService.clearRefreshTokenCookie(res);

    res.status(HttpStatus.OK).json({
      status: true,
      data: {
        message,
      },
    });
  };
}
