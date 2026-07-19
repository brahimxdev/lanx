import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { NextFunction, Request, Response } from "express";
import type {
  IChangePassword,
  IChangeEmail,
  IConfirmChangeEmail,
  IListSessionsQuery,
} from "./account.validation.js";
import { AccountService } from "./account.service.js";
import { TokenService } from "@/modules/auth/index.js";

export class AccountController {
  // Change password in dashboard - (need auth access)
  static changePassword = async (
    req: Request<unknown, unknown, IChangePassword>,
    res: Response,
    next: NextFunction
  ) => {
    //* Validation middleware already validated data!

    if (!req.user) {
      const err = AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    const authUserId = req.user.id;
    const { existingPassword, newPassword } = req.body;

    // Service layer to handle logic
    const { sanitizedUser, accessToken, refreshToken } = await AccountService.changePassword(
      authUserId,
      { existingPassword, newPassword },
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
    );

    // Set refresh cookie
    TokenService.setRefreshTokenCookie(res, refreshToken);

    res.status(HttpStatus.OK).json({
      status: true,
      message:
        "Password changed successfully, You have been logged out from all devices, please login again.",
      data: {
        user: sanitizedUser,
        accessToken,
      },
    });
  };

  // Request email change in dashboard - (need auth acess)
  static changeEmail = async (
    req: Request<unknown, unknown, IChangeEmail>,
    res: Response,
    next: NextFunction
  ) => {
    //* Validation middleware already validated data!

    if (!req.user) {
      const err = AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    const authUserId = req.user.id;

    const { newEmail, currentPassword } = req.body;

    const { message } = await AccountService.requestChangeEmail(authUserId, {
      newEmail,
      currentPassword,
    });

    res.status(HttpStatus.OK).json({
      status: true,
      data: message,
    });
  };

  // Confirm email change in dashboard - (need auth access)
  static confirmEmailChange = async (
    req: Request<unknown, unknown, IConfirmChangeEmail>,
    res: Response,
    next: NextFunction
  ) => {
    //* Validation middleware already validated data!

    if (!req.user) {
      const err = AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    const authUserId = req.user.id;

    const { confirmationCode } = req.body;

    // Service layer to handle logic
    const { sanitizedUser } = await AccountService.confirmChangeEmail(authUserId, {
      confirmationCode,
    });

    res.status(HttpStatus.OK).json({
      status: true,
      message:
        "Email changed successfully, You have been logged out from all devices, please login again.",
      data: {
        user: sanitizedUser,
      },
    });
  };

  // List all sessions in dashboard - (need auth access)
  static listSessions = async (
    req: Request<unknown, unknown, unknown, IListSessionsQuery>,
    res: Response,
    next: NextFunction
  ) => {
    //* Validation middleware already validated data!

    if (!req.user) {
      const err = AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    const authUserId = req.user.id;

    const { status, sortBy, sortOrder, limit, page } = req.query;

    // Service layer to handle logic
    const { sessions, pagination } = await AccountService.listSessions(authUserId, {
      status,
      sortBy,
      sortOrder,
      limit,
      page,
    });

    res.status(HttpStatus.OK).json({
      status: true,
      data: { sessions, pagination },
    });
  };
}
