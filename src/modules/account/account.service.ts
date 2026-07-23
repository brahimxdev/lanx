import type { IAuthUserRepo, ISessionRepo, IEmailConfirmationRepo } from "@/shared/repo/index.js";
import type { EmailService } from "../email/email.service.js";
import type {
  IChangePassword,
  IChangeEmail,
  IConfirmChangeEmail,
  IListSessionsQuery,
} from "./account.validation.js";
import type { IRequestMeta, IAuthenticatedUser, ITokenService } from "@/modules/auth/index.js";
import { AppError, ErrorCode } from "@/errors/index.js";
import bcrypt from "bcryptjs";
import { authConfig } from "@/config/index.js";
import { db } from "@/db/client.js";
import { tempEmailDomain } from "@/shared/constants/tempEmail.js";
import {
  generateConfirmationCode,
  hashConfirmationCode,
  verifyConfirmationCode,
} from "@/utils/confirmation-code.util.js";

export class AccountService {
  constructor(
    private readonly authUserRepo: IAuthUserRepo,
    private readonly emailConfirmationRepo: IEmailConfirmationRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly emailService: EmailService,
    private readonly tokenService: ITokenService
  ) {}

  // Change password (need auth access)
  async changePassword(authUserId: string, input: IChangePassword, meta: IRequestMeta) {
    // Find user by id
    const existingUser = await this.authUserRepo.findById(authUserId);

    if (!existingUser) {
      throw AppError.unauthorized("User not found", ErrorCode.UNAUTHORIZED);
    }

    // compare existing password against hash in db
    const isExistingPasswordMatch = await bcrypt.compare(
      input.existingPassword,
      existingUser.passwordHash
    );

    if (!isExistingPasswordMatch) {
      throw AppError.badRequest("Existing password is incorrect", ErrorCode.INVALID_CREDENTIALS);
    }

    // Compare new pass against existing pass to see if it's the same
    const isNewPasswordSame = await bcrypt.compare(input.newPassword, existingUser.passwordHash);

    if (isNewPasswordSame) {
      throw AppError.forbidden(
        "Your new password cannot be same as old password",
        ErrorCode.FORBIDDEN
      );
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, authConfig.bcryptSaltRounds);
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    // db transactions
    const { user, newSessionRecord } = await db.transaction(async (tx) => {
      // tx 1 - invalidate all existing sessions for the user
      await this.sessionRepo.revokeAllActive(existingUser.id, tx);

      // tx 2 - update password
      const user = await this.authUserRepo.updatePassword(existingUser.id, newPasswordHash, tx);

      // tx 3 - Issue new session
      const newSessionRecord = await this.sessionRepo.createSession({
        authUserId: existingUser.id,
        refreshTokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        deviceType: meta.deviceType,
        deviceOs: meta.deviceOs,
        deviceBrowser: meta.deviceBrowser,
      });

      return { user, newSessionRecord };
    });

    // sign access Token
    const accessToken = this.tokenService.signAccessToken({
      userId: existingUser.id,
      sessionId: newSessionRecord.id,
    });

    // sanitize user to return to client
    const sanitizedUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    // Send password reset notification to email
    await this.emailService.sendPasswordResetNotification(tempEmailDomain);

    return { sanitizedUser, accessToken, refreshToken };
  }

  // Request change of email (need auth access)
  async requestChangeEmail(authUserId: string, input: IChangeEmail) {
    // Find user by id
    const existingUser = await this.authUserRepo.findById(authUserId);

    if (!existingUser) {
      throw AppError.unauthorized("User not found", ErrorCode.UNAUTHORIZED);
    }

    // compare existing password against hash in db
    const isCurrentPasswordMatch = await bcrypt.compare(
      input.currentPassword,
      existingUser.passwordHash
    );

    if (!isCurrentPasswordMatch) {
      throw AppError.badRequest("Existing password is incorrect", ErrorCode.INVALID_CREDENTIALS);
    }

    // Check if inputed email is same as new one
    if (existingUser.email === input.newEmail) {
      throw AppError.badRequest(
        "Your new email cannot be same as current email",
        ErrorCode.ALREADY_EXISTS
      );
    }

    const isEmailTaken = await this.authUserRepo.findByEmail(input.newEmail);

    if (isEmailTaken) {
      throw AppError.conflict("Email already exist", ErrorCode.ALREADY_EXISTS);
    }

    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

    // db transactions
    await db.transaction(async (tx) => {
      // tx 1 -Invalidate previous reset code if any
      await this.emailConfirmationRepo.invalidateAllUnused(existingUser.id, "change_email", tx);

      // tx 2 - Insert new confirmation record in db
      await this.emailConfirmationRepo.create(
        {
          authUserId: existingUser.id,
          codeHash: confirmationCodeHash,
          confirmationType: "change_email",
          newEmail: input.newEmail,
          expiresAt: new Date(Date.now() + authConfig.confirmationCodeTTL),
        },
        tx
      );
    });

    await this.emailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

    return { message: "Confirmation code sent to your email" };
  }

  // Confirm email change (need auth access)
  async confirmChangeEmail(authUserId: string, input: IConfirmChangeEmail) {
    // Fetch latest unused confirmation code for the user
    const confirmationRecord = await this.emailConfirmationRepo.findLatestUnused(authUserId);

    if (confirmationRecord?.confirmationType !== "change_email") {
      throw AppError.badRequest("No active email change request", ErrorCode.NO_ACTIVE_CONFIRMATION);
    }

    if (confirmationRecord.attemptCount >= 5) {
      throw AppError.tooManyRequests("Too many attempts, please request a new code");
    }

    if (confirmationRecord.expiresAt <= new Date()) {
      await this.emailConfirmationRepo.incrementAttemptCount(confirmationRecord.id);
      throw AppError.badRequest(
        "This code has expired, please request a new one",
        ErrorCode.EXPIRED_CODE
      );
    }

    // compare inputed code against stored hased code
    const isCodeValid = verifyConfirmationCode(input.confirmationCode, confirmationRecord.codeHash);
    if (!isCodeValid) {
      await this.emailConfirmationRepo.incrementAttemptCount(confirmationRecord.id);
      throw AppError.unauthorized("Invalid confirmation code", ErrorCode.INVALID_CODE);
    }

    if (!confirmationRecord.newEmail) {
      throw AppError.internalServerError("Confirmation record missing target email");
    }

    if (!confirmationRecord.newEmail) {
      throw AppError.internalServerError("Confirmation record missing target email");
    }

    const newEmail = confirmationRecord.newEmail;

    // Recheck if email hasn't been taken
    const isEmailTaken = await this.authUserRepo.findByEmail(newEmail);

    if (isEmailTaken) {
      throw AppError.conflict("Email already exist", ErrorCode.ALREADY_EXISTS);
    }

    // db transactions
    const { user } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await this.emailConfirmationRepo.markUsed(confirmationRecord.id, tx);

      // tx 2 - invalidate all existing sessions for the user
      await this.sessionRepo.revokeAllActive(authUserId, tx);

      // tx 3 - update email
      const user = await this.authUserRepo.updateEmail(authUserId, newEmail, tx);

      return { user };
    });

    // Sanitized user to return to client
    const sanitizedUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    await this.emailService.sendEmailChangeNotification(user.email, confirmationRecord.newEmail);

    return { sanitizedUser };
  }

  // List all sessions
  async listSessions(authUserId: string, queryParams: IListSessionsQuery) {
    const { sessions, pagination } = await this.sessionRepo.findManyByUserId(
      authUserId,
      queryParams
    );
    return { sessions, pagination };
  }

  // Revoke a session
  async revokeSession(authUserId: string, sessionId: string) {
    // Find the session
    const activeSession = await this.sessionRepo.findActiveById(sessionId);

    if (!activeSession) {
      throw AppError.notFound("Session not found", ErrorCode.NOT_FOUND);
    }

    // Ownership check - ensure the session belongs to the requesting user
    if (activeSession.authUserId !== authUserId) {
      throw AppError.forbidden(
        "You do not have permission to revoke this session",
        ErrorCode.FORBIDDEN
      );
    }

    // Revoke session
    await this.sessionRepo.revokeSession(sessionId);
  }
}
