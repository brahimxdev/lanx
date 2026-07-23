import type { Request, Response } from "express";
import type { AccountService } from "./account.service.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { IRequestMeta, IAuthCookieService, IAuthenticatedUser } from "@/modules/auth/index.js";
import type {
  TypedRequest,
  TypedBodyRequest,
  TypedQueryRequest,
  TypedParamsRequest,
} from "@/types/typed-request.js";
import type {
  IChangeEmail,
  IChangePassword,
  IConfirmChangeEmail,
  IListSessionsQuery,
  IRevokeSessionParams,
} from "./account.validation.js";

export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly tokenService: IAuthCookieService
  ) {}

  private assertUser(
    req: TypedRequest
  ): asserts req is TypedRequest & { user: IAuthenticatedUser } {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
    }
  }

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

  // Change password in dashboard - (need auth access)
  changePassword = async (req: TypedBodyRequest<IChangePassword>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;
    const { existingPassword, newPassword } = req.validated.body;

    // Service layer to handle logic
    const { sanitizedUser, accessToken, refreshToken } = await this.accountService.changePassword(
      authUserId,
      { existingPassword, newPassword },
      this.extractMeta(req)
    );

    // Set refresh cookie
    this.tokenService.setRefreshTokenCookie(res, refreshToken);

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
  requestChangeEmail = async (req: TypedBodyRequest<IChangeEmail>, res: Response) => {
    //* Validation middleware already validated data!
    this.assertUser(req);

    const authUserId = req.user.id;

    const { newEmail, currentPassword } = req.validated.body;

    // Service layer to handle logic
    const { message } = await this.accountService.requestChangeEmail(authUserId, {
      newEmail,
      currentPassword,
    });

    res.status(HttpStatus.OK).json({
      status: true,
      data: message,
    });
  };

  // Confirm email change in dashboard - (need auth access)
  confirmEmailChange = async (req: TypedBodyRequest<IConfirmChangeEmail>, res: Response) => {
    //* Validation middleware already validated data!
    this.assertUser(req);

    const authUserId = req.user.id;

    const { confirmationCode } = req.validated.body;

    // Service layer to handle logic
    const { sanitizedUser } = await this.accountService.confirmChangeEmail(authUserId, {
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
  listSessions = async (req: TypedQueryRequest<IListSessionsQuery>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;

    const { status, sortBy, sortOrder, limit, page } = req.validated.query;

    // Service layer to handle logic
    const { sessions, pagination } = await this.accountService.listSessions(authUserId, {
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

  // Revoke a session in dashboard - (need auth access)
  revokeSession = async (req: TypedParamsRequest<IRevokeSessionParams>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;

    const { sessionId } = req.validated.params;

    // Service layer to handle logic
    await this.accountService.revokeSession(authUserId, sessionId);

    res.status(HttpStatus.OK).json({
      status: true,
      message: "Device logged out successfully",
    });
  };
}
