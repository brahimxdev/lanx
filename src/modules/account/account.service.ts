import type { IAuthUserRepo, ISessionRepo, IEmailConfirmationRepo } from "@/shared/repo/index.js";
import type { EmailService } from "../email/email.service.js";
import type {
  IChangePassword,
  IChangeEmail,
  IConfirmChangeEmail,
  IListSessionsQuery,
  IDeleteAccount,
} from "./account.validation.js";
import type { IRequestMeta, ITokenService } from "@/modules/auth/index.js";
import { AppError, ErrorCode } from "@/errors/index.js";
import bcrypt from "bcryptjs";
import { authConfig, redisConfig } from "@/config/index.js";
import { db } from "@/db/client.js";
import { tempEmailDomain } from "@/shared/constants/tempEmail.js";
import {
  generateConfirmationCode,
  hashConfirmationCode,
  verifyConfirmationCode,
} from "@/utils/confirmation-code.util.js";
import { sanitizeUser } from "@/utils/sanitizeUser.js";
import type { ICacheService } from "@/shared/services/cache.service.js";

export class AccountService {
  constructor(
    private readonly authUserRepo: IAuthUserRepo,
    private readonly emailConfirmationRepo: IEmailConfirmationRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly emailService: EmailService,
    private readonly tokenService: ITokenService,
    private readonly cacheService: ICacheService
  ) {}

  // Change password (need auth access)
  async changePassword(
    authUserId: string,
    deviceId: string,
    input: IChangePassword,
    meta: IRequestMeta
  ) {
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
    const { user, newSessionRecord, revokedSessions } = await db.transaction(async (tx) => {
      // tx 1 - invalidate all existing sessions for the user
      const revokedSessions = await this.sessionRepo.revokeAllActive(existingUser.id, tx);

      // tx 2 - update password
      const user = await this.authUserRepo.updatePassword(existingUser.id, newPasswordHash, tx);

      // tx 3 - Issue new session
      const newSessionRecord = await this.sessionRepo.createSession({
        authUserId: existingUser.id,
        deviceId,
        refreshTokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        deviceType: meta.deviceType,
        deviceOs: meta.deviceOs,
        deviceBrowser: meta.deviceBrowser,
      });

      return { user, newSessionRecord, revokedSessions };
    });

    // Blocklist every session the password change just revoked
    await Promise.all(
      revokedSessions.map((session) =>
        this.cacheService.blocklistSession(session.id, redisConfig.ttl.accessToken)
      )
    );

    // sign access Token
    const accessToken = this.tokenService.signAccessToken({
      userId: existingUser.id,
      sessionId: newSessionRecord.id,
    });

    // sanitize user to return to client
    const sanitizedUser = sanitizeUser(user);

    // Send password reset notification to email
    void this.emailService.sendPasswordResetNotification(tempEmailDomain);

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

    const { allowed } = await this.cacheService.checkAndIncrementIssuance(
      existingUser.id,
      "change_email"
    );

    if (!allowed) {
      throw AppError.tooManyRequests(
        "Too many attempts, please request a new code",
        ErrorCode.TOO_MANY_REQUESTS
      );
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

    await this.cacheService.resetConfirmAttempts(existingUser.id, "change_email");
    void this.emailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

    return { message: "Confirmation code sent to your new email" };
  }

  // Confirm email change (need auth access)
  async confirmChangeEmail(authUserId: string, input: IConfirmChangeEmail) {
    // Fetch latest unused confirmation code for the user
    const confirmationRecord = await this.emailConfirmationRepo.findLatestUnused(authUserId);

    if (confirmationRecord?.confirmationType !== "change_email") {
      throw AppError.badRequest("No active email change request", ErrorCode.NO_ACTIVE_CONFIRMATION);
    }

    // Rate limit check in redis
    const attempts = await this.cacheService.getConfirmAttempts(
      confirmationRecord.authUserId,
      confirmationRecord.confirmationType
    );

    if (attempts >= 5) {
      throw AppError.tooManyRequests("Too many attempts, please request a new code");
    }

    // Expiry check
    if (confirmationRecord.expiresAt <= new Date()) {
      await this.cacheService.incrementConfirmAttempts(
        confirmationRecord.authUserId,
        confirmationRecord.confirmationType,
        redisConfig.ttl.confirmationCode
      );
      throw AppError.badRequest(
        "This code has expired, please request a new one",
        ErrorCode.EXPIRED_CODE
      );
    }

    // compare inputed code against stored hased code
    const isCodeValid = verifyConfirmationCode(input.confirmationCode, confirmationRecord.codeHash);

    if (!isCodeValid) {
      await this.cacheService.incrementConfirmAttempts(
        confirmationRecord.authUserId,
        confirmationRecord.confirmationType,
        redisConfig.ttl.confirmationCode
      );
      throw AppError.unauthorized("Invalid code or email", ErrorCode.INVALID_CODE);
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
    const { user, revokedSessions } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await this.emailConfirmationRepo.markUsed(confirmationRecord.id, tx);

      // tx 2 - invalidate all existing sessions for the user
      const revokedSessions = await this.sessionRepo.revokeAllActive(authUserId, tx);

      // tx 3 - update email
      const user = await this.authUserRepo.updateEmail(authUserId, newEmail, tx);

      return { user, revokedSessions };
    });

    // Blocklist every session revoked by the email change
    await Promise.all(
      revokedSessions.map((session) =>
        this.cacheService.blocklistSession(session.id, redisConfig.ttl.accessToken)
      )
    );

    // Sanitized user to return to client
    const sanitizedUser = sanitizeUser(user);

    void this.emailService.sendEmailChangeNotification(user.email, confirmationRecord.newEmail);

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

    // Blocklist sessionId in Redis so its access token is rejected
    await this.cacheService.blocklistSession(sessionId, redisConfig.ttl.accessToken);
  }

  // Delete account - (need auth access)
  async deleteAccount(authUserId: string, input: IDeleteAccount) {
    // Check if user exists
    const existingUser = await this.authUserRepo.findById(authUserId);

    if (!existingUser) {
      throw AppError.unauthorized("User not found, please login", ErrorCode.UNAUTHORIZED);
    }

    // compare current password against hash in db
    const isCurrentPasswordMatch = await bcrypt.compare(
      input.currentPassword,
      existingUser.passwordHash
    );

    if (!isCurrentPasswordMatch) {
      throw AppError.badRequest("Password is incorrect", ErrorCode.INVALID_CREDENTIALS);
    }

    const { sessions: sessionsToRevoke } = await this.sessionRepo.findManyByUserId(authUserId, {
      status: "active",
      sortBy: "lastUsedAt",
      sortOrder: "desc",
      page: 1,
      limit: 1000,
    });

    // db transactions
    await db.transaction(async (tx) => {
      // tx 1 - Invalidate all pending confirmation codes
      await this.emailConfirmationRepo.invalidateAllUnusedForUser(authUserId, tx);

      // // tx 2 - invalidate all existing sessions for the user
      //  Already set in auto trigger

      // tx 3 - Soft delete auth user
      await this.authUserRepo.softDelete(authUserId, tx);
    });

    // Blocklist every session that was active going into the delete
    await Promise.all(
      sessionsToRevoke.map((session) =>
        this.cacheService.blocklistSession(session.id, redisConfig.ttl.accessToken)
      )
    );

    void this.emailService.sendAccountDeletedNotification(tempEmailDomain);
  }
}
