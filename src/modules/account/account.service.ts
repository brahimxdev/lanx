import { AppError, ErrorCode } from "@/errors/index.js";
import type {
  IChangeEmail,
  IChangePassword,
  IConfirmChangeEmail,
  IListSessionsQuery,
} from "./account.validation.js";
import {
  authUserRepository,
  emailConfirmationRepository,
  sessionRespository,
} from "@/shared/repo/index.js";
import bcrypt from "bcryptjs";
import { db } from "@/db/client.js";
import { TokenService, type IRequestMeta, type IAuthenticatedUser } from "@/modules/auth/index.js";
import { EmailService } from "../email/email.service.js";
import { authConfig } from "@/config/index.js";
import { tempEmailDomain } from "@/shared/constants/tempEmail.js";
import {
  generateConfirmationCode,
  hashConfirmationCode,
  verifyConfirmationCode,
} from "@/utils/confirmation-code.util.js";

export class AccountService {
  // Change password (need auth access)
  static async changePassword(authUserId: string, input: IChangePassword, meta: IRequestMeta) {
    // Find user by id
    const existingUser = await authUserRepository.findById(authUserId);

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
    const isNewPasswordMatch = await bcrypt.compare(input.newPassword, existingUser.passwordHash);

    if (isNewPasswordMatch) {
      throw AppError.forbidden(
        "Your new password cannot be same as old password",
        ErrorCode.FORBIDDEN
      );
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 12);

    // Generate + hash refresh Token
    const refreshToken = TokenService.generateRefreshToken();
    const refreshTokenHash = TokenService.hashRefreshToken(refreshToken);

    // db transactions
    const { user, newSessionRecord } = await db.transaction(async (tx) => {
      // tx 1 - invalidate all existing sessions for the user
      await sessionRespository.revokeAllActive(existingUser.id, tx);

      // tx 2 - update password
      const user = await authUserRepository.updatePassword(existingUser.id, newPasswordHash, tx);

      // tx 3 - Issue new session
      const newSessionRecord = await sessionRespository.createSession(
        {
          authUserId: existingUser.id,
          refreshTokenHash: refreshTokenHash,
          expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          deviceType: meta.deviceType,
          deviceOs: meta.deviceOs,
          deviceBrowser: meta.deviceBrowser,
        },
        tx
      );

      return { user, newSessionRecord };
    });

    // sign access Token
    const accessToken = TokenService.signAccessToken({
      userId: existingUser.id,
      sessionId: newSessionRecord.id,
    });

    // Sanitized user to return to client
    const sanitizedUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    // Send password reset notification
    await EmailService.sendPasswordResetNotification(tempEmailDomain);

    return { sanitizedUser, accessToken, refreshToken };
  }

  // Request change of email (need auth access)
  static async requestChangeEmail(authUserId: string, input: IChangeEmail) {
    // Find user by id
    const existingUser = await authUserRepository.findById(authUserId);

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
    const isEmailMatch = existingUser.email === input.newEmail;

    if (isEmailMatch) {
      throw AppError.badRequest(
        "Your new email cannot be same as current email",
        ErrorCode.ALREADY_EXISTS
      );
    }

    const isEmailTaken = await authUserRepository.findByEmail(input.newEmail);

    if (isEmailTaken) {
      throw AppError.forbidden("Email already exist", ErrorCode.FORBIDDEN);
    }

    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

    // db transactions
    await db.transaction(async (tx) => {
      // tx 1 -Invalidate previous reset code if any
      await emailConfirmationRepository.invalidateAllUnused(existingUser.id, "change_email", tx);

      // tx 2 - Insert new confirmation record in db
      await emailConfirmationRepository.create(
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

    await EmailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

    return { message: "Confirmation code sent to your email" };
  }

  // Confirm email change (need auth access)
  static async confirmChangeEmail(
    authUserId: string,
    input: IConfirmChangeEmail
  ): Promise<{ sanitizedUser: IAuthenticatedUser }> {
    // Fetch latest unused confirmation code for the user
    const confirmationRecord = await emailConfirmationRepository.findLatestUnused(authUserId);

    if (confirmationRecord?.confirmationType !== "change_email") {
      throw AppError.badRequest("No active email change request", ErrorCode.NO_ACTIVE_CONFIRMATION);
    }

    if (confirmationRecord.attemptCount >= 5) {
      throw AppError.tooManyRequests("Something went wrong, please request a new code");
    }

    if (confirmationRecord.expiresAt <= new Date()) {
      await emailConfirmationRepository.incrementAttemptCount(confirmationRecord.id);
      throw AppError.badRequest(
        "This code has expired, please request a new one",
        ErrorCode.EXPIRED_CODE
      );
    }

    // compare inputed code against stored hased code
    const isPlainEqualHashed = verifyConfirmationCode(
      input.confirmationCode,
      confirmationRecord.codeHash
    );

    if (!isPlainEqualHashed) {
      await emailConfirmationRepository.incrementAttemptCount(confirmationRecord.id);
      throw AppError.unauthorized("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    if (!confirmationRecord.newEmail) {
      throw AppError.internalServerError("Confirmation record missing target email");
    }

    const newEmail = confirmationRecord.newEmail;

    // Recheck if email hasn't been taken
    const isEmailTaken = await authUserRepository.findByEmail(newEmail);

    if (isEmailTaken) {
      throw AppError.conflict("Email already exist", ErrorCode.ALREADY_EXISTS);
    }

    // db transactions
    const { user } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await emailConfirmationRepository.markUsed(confirmationRecord.id, tx);

      // tx 2 - invalidate all existing sessions for the user
      await sessionRespository.revokeAllActive(authUserId, tx);

      // tx 3 - update email
      const user = await authUserRepository.updateEmail(authUserId, newEmail, tx);

      return { user };
    });

    // Sanitized user to return to client
    const sanitizedUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    await EmailService.sendEmailChangeNotification(user.email, confirmationRecord.newEmail);

    return { sanitizedUser };
  }

  static async listSessions(authUserId: string, queryParams: IListSessionsQuery) {
    const { sessions, pagination } = await sessionRespository.findManyByUserId(
      authUserId,
      queryParams
    );

    return { sessions, pagination };
  }
}
