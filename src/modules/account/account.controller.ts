import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { NextFunction, Response } from "express";
import type {
  IChangePassword,
  IChangeEmail,
  IConfirmChangeEmail,
  IListSessionsQuery,
} from "./account.validation.js";
import type { AccountService } from "./account.service.js";
import { TokenService } from "@/modules/auth/index.js";
import type { TypedBodyRequest, TypedQueryRequest } from "@/types/typed-request.js";

export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  private requireUser(
    req: { user?: unknown },
    next: NextFunction
  ): req is { user: NonNullable<typeof req.user> } {
    if (!req.user) {
      next(AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED));
      return false;
    }
    return true;
  }

  private extractMeta(
    req: Parameters<typeof this.requireUser>[0] & {
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }
  ): IRequestMeta {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      deviceType: (req.headers["x-device-type"] as string) ?? null,
      deviceOs: (req.headers["x-device-os"] as string) ?? null,
      deviceBrowser: (req.headers["x-device-browser"] as string) ?? null,
    };
  }

  // Change password in dashboard - (need auth access)
  changePassword = async (
    req: TypedBodyRequest<IChangePassword>,
    res: Response,
    next: NextFunction
  ) => {
    //* Validation middleware already validated data!

    if (!this.requireUser(req, next)) return;

    const authUserId = req.user.id;
    const { existingPassword, newPassword } = req.validated.body;

    // Service layer to handle logic
    const { sanitizedUser, accessToken, refreshToken } = await this.accountService.changePassword(
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
  changeEmail = async (req: TypedBodyRequest<IChangeEmail>, res: Response, next: NextFunction) => {
    //* Validation middleware already validated data!

    if (!req.user) {
      const err = AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
      next(err);
      return;
    }

    const authUserId = req.user.id;

    const { newEmail, currentPassword } = req.validated.body;

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
  confirmEmailChange = async (
    req: TypedBodyRequest<IConfirmChangeEmail>,
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

    const { confirmationCode } = req.validated.body;

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
  listSessions = async (
    req: TypedQueryRequest<IListSessionsQuery>,
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

    const { status, sortBy, sortOrder, limit, page } = req.validated.query;

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
