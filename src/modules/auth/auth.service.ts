import type { IAuthUserRepo, IEmailConfirmationRepo, ISessionRepo } from "@/shared/repo/index.js";
import type { EmailService } from "../email/email.service.js";
import type { ITokenService } from "./token.service.js";
import type {
  ISignup,
  IConfirmEmail,
  IResendConfirmationCode,
  IForgotPassword,
  IResetPassword,
  ISignIn,
} from "./auth.validation.js";
import { AppError, ErrorCode } from "@/errors/index.js";
import bcrypt from "bcryptjs";
import {
  generateConfirmationCode,
  hashConfirmationCode,
  verifyConfirmationCode,
} from "@/utils/confirmation-code.util.js";
import { db } from "@/db/client.js";
import { authConfig, redisConfig } from "@/config/index.js";
import type { IRequestMeta } from "@/modules/auth/index.js";
import { tempEmailDomain } from "@/shared/constants/tempEmail.js";
import { sanitizeUser } from "@/utils/sanitizeUser.js";
import type { ICacheService } from "@/shared/services/cache.service.js";
import { isUniqueViolation } from "@/utils/isUniqueViolation.js";

export class AuthService {
  constructor(
    private readonly authUserRepo: IAuthUserRepo,
    private readonly emailConfirmationRepo: IEmailConfirmationRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly emailService: EmailService,
    private readonly tokenService: ITokenService,
    private readonly cacheService: ICacheService
  ) {}

  // Create new user
  async createUser(input: ISignup) {
    // 1. Check if account exist by email
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (existingUser) {
      throw AppError.conflict("Account already exist, please sign in", ErrorCode.ALREADY_EXISTS);
    }

    // 2. Hash password + Generate confirmation code
    const passwordHash = await bcrypt.hash(input.password, 12);
    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

    // 3. Save unverified user
    // db transactions
    try {
      const { user } = await db.transaction(async (tx) => {
        // tx 1 - create user record
        const user = await this.authUserRepo.createUser({ email: input.email, passwordHash }, tx);

        // tx 2 - create confirmation record
        const confirmationRecord = await this.emailConfirmationRepo.create(
          {
            authUserId: user.id,
            codeHash: confirmationCodeHash,
            confirmationType: "sign_up",
            expiresAt: new Date(Date.now() + authConfig.confirmationCodeTTL),
          },
          tx
        );

        return { user, confirmationRecord };
      });

      const newUser = sanitizeUser(user);

      // Send code to user via email
      void this.emailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

      return { newUser };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw AppError.conflict("Account already exist, please sign in", ErrorCode.ALREADY_EXISTS);
      }

      throw error;
    }
  }

  // Confirm email for user signing up
  async confirmEmail(deviceId: string, input: IConfirmEmail, meta: IRequestMeta) {
    // 1. Check if account exist by email
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (!existingUser) {
      throw AppError.badRequest("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    if (existingUser.isEmailVerified) {
      throw AppError.conflict("Invalid code or email", ErrorCode.ALREADY_VERIFIED);
    }

    // Look up latest unused confirmation code for the user
    const confirmationRecord = await this.emailConfirmationRepo.findLatestUnused(existingUser.id);

    if (!confirmationRecord) {
      throw AppError.badRequest(
        "No active record, please resend",
        ErrorCode.NO_ACTIVE_CONFIRMATION
      );
    }

    // Rate limit check in redis
    const attempts = await this.cacheService.getConfirmAttempts(
      existingUser.id,
      confirmationRecord.confirmationType
    );

    if (attempts >= 5) {
      throw AppError.tooManyRequests("Too many attempts, please request a new code");
    }

    // Expiry check
    if (confirmationRecord.expiresAt <= new Date()) {
      await this.cacheService.incrementConfirmAttempts(
        existingUser.id,
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
        existingUser.id,
        confirmationRecord.confirmationType,
        redisConfig.ttl.confirmationCode
      );
      throw AppError.unauthorized("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    // Generate + hash refresh Token
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    // db transactions
    const { updatedUser, newSessionRecord, revokedSessions } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await this.emailConfirmationRepo.markUsed(confirmationRecord.id, tx);

      // tx 2 - mark email verified
      const updatedUser = await this.authUserRepo.markEmailVerified(existingUser.id, tx);

      // tx 3 - invalidate all existing sessions for the user
      const revokedSessions = await this.sessionRepo.revokeAllActive(existingUser.id, tx);

      // tx 4 - Issue new session
      const newSessionRecord = await this.sessionRepo.createSession(
        {
          authUserId: existingUser.id,
          deviceId,
          refreshTokenHash: refreshTokenHash,
          expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
          ...meta,
        },
        tx
      );

      return { updatedUser, newSessionRecord, revokedSessions };
    });

    // Blocklist every session that is just revoked
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

    // Sanitized user to return to client
    const newUser = sanitizeUser(updatedUser);

    void this.emailService.sendWelcomeEmailPro(tempEmailDomain, { email: newUser.email });
    return { newUser, accessToken, refreshToken };
  }

  // Resend confirmation code
  async resendConfirmationCode(input: IResendConfirmationCode) {
    // Check if account exist in db
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (!existingUser || existingUser.isEmailVerified) {
      return {
        message: "If an account exist, a confirmation code has been sent!",
      };
    }

    const { allowed, retryAfter } = await this.cacheService.checkAndIncrementIssuance(
      existingUser.id,
      "sign_up"
    );

    if (!allowed) {
      return { message: "If an account exist, a confirmation code has been sent!", retryAfter };
    }

    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

    // db transactions
    await db.transaction(async (tx) => {
      // tx 1 - Invalidate all unused code
      await this.emailConfirmationRepo.invalidateAllUnused(existingUser.id, "sign_up", tx);

      // tx 2 - Insert code into confirmation record
      await this.emailConfirmationRepo.create(
        {
          authUserId: existingUser.id,
          codeHash: confirmationCodeHash,
          confirmationType: "sign_up",
          expiresAt: new Date(Date.now() + authConfig.confirmationCodeTTL),
        },
        tx
      );
    });

    // 4. Send code to user via email
    await this.cacheService.resetConfirmAttempts(existingUser.id, "sign_up");
    void this.emailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

    return {
      message: "If an account exist, a code has been sent!",
    };
  }

  // Sign in
  async signIn(deviceId: string, input: ISignIn, meta: IRequestMeta) {
    // Check if user exist
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (!existingUser) {
      throw AppError.unauthorized(
        "Email/password combination is incorrect",
        ErrorCode.UNAUTHORIZED
      );
    }

    // compare password against hash in db
    const isPasswordMatch = await bcrypt.compare(input.password, existingUser.passwordHash);

    if (!isPasswordMatch) {
      throw AppError.unauthorized(
        "Email/password combination is incorrect",
        ErrorCode.UNAUTHORIZED
      );
    }

    // Check if email is not confirmed
    if (!existingUser.isEmailVerified) {
      throw AppError.unauthorized("Your email has not been verified", ErrorCode.EMAIL_NOT_VERIFIED);
    }

    const { sessionId, refreshToken } = await this.getOrCreateSession(
      existingUser.id,
      deviceId,
      meta
    );

    // sign access Token
    const accessToken = this.tokenService.signAccessToken({
      userId: existingUser.id,
      sessionId,
    });

    // Sanitized user to return to client
    const user = sanitizeUser(existingUser);

    return { user, accessToken, refreshToken };
  }

  private async getOrCreateSession(
    userId: string,
    deviceId: string,
    meta: IRequestMeta
  ): Promise<{ sessionId: string; refreshToken: string }> {
    const existingSession = await this.sessionRepo.findActiveByUserAndDevice(userId, deviceId);

    if (existingSession) {
      return this.rotateExistingSession(existingSession.id, meta);
    }

    try {
      return await this.createFreshSession(userId, deviceId, meta);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const winner = await this.sessionRepo.findActiveByUserAndDevice(userId, deviceId);
        if (winner) {
          return this.rotateExistingSession(winner.id, meta);
        }
      }
      throw err;
    }
  }

  private async rotateExistingSession(
    sessionId: string,
    meta: IRequestMeta
  ): Promise<{ sessionId: string; refreshToken: string }> {
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const rotated = await this.sessionRepo.rotateRefreshToken(sessionId, {
      refreshTokenHash,
      expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { sessionId: rotated.id, refreshToken };
  }

  private async createFreshSession(
    userId: string,
    deviceId: string,
    meta: IRequestMeta
  ): Promise<{ sessionId: string; refreshToken: string }> {
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const newSessionRecord = await this.sessionRepo.createSession({
      authUserId: userId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      deviceType: meta.deviceType,
      deviceOs: meta.deviceOs,
      deviceBrowser: meta.deviceBrowser,
      deviceId,
    });

    return { sessionId: newSessionRecord.id, refreshToken };
  }

  // Forgot password
  async forgotPassword(input: IForgotPassword) {
    // Check if user exist by email
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (!existingUser) {
      return {
        message: "If an account exist, a confirmation code has been sent!",
      };
    }
    const { allowed, retryAfter } = await this.cacheService.checkAndIncrementIssuance(
      existingUser.id,
      "password_reset"
    );

    if (!allowed) {
      return { message: "If an account exist, a confirmation code has been sent!", retryAfter };
    }

    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

    // db transactions
    await db.transaction(async (tx) => {
      // tx 1 - Invalidate previous code
      await this.emailConfirmationRepo.invalidateAllUnused(existingUser.id, "password_reset", tx);

      // tx 2 - Insert new confirmation record in db
      await this.emailConfirmationRepo.create(
        {
          authUserId: existingUser.id,
          codeHash: confirmationCodeHash,
          confirmationType: "password_reset",
          expiresAt: new Date(Date.now() + authConfig.confirmationCodeTTL),
        },
        tx
      );
    });

    await this.cacheService.resetConfirmAttempts(existingUser.id, "password_reset");

    void this.emailService.sendPasswordResetCode(tempEmailDomain, confirmationCode);

    return {
      message: "If an account exist, a code has been sent!",
    };
  }

  // Reset password
  async resetPassword(input: IResetPassword) {
    // Check if user exist by email
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (!existingUser) {
      throw AppError.badRequest("Invalid/expired code", ErrorCode.INVALID_CODE);
    }

    // Look up password reset confirmation record
    const confirmationRecord = await this.emailConfirmationRepo.findLatestUnused(existingUser.id);

    if (confirmationRecord?.confirmationType !== "password_reset") {
      throw AppError.badRequest(
        "No active confirmation record, please resend",
        ErrorCode.NO_ACTIVE_CONFIRMATION
      );
    }

    // Rate limit check in redis
    const attempts = await this.cacheService.getConfirmAttempts(
      existingUser.id,
      confirmationRecord.confirmationType
    );

    if (attempts >= 5) {
      throw AppError.tooManyRequests("Something went wrong, please resend a new code");
    }

    // Expiry check
    if (confirmationRecord.expiresAt <= new Date()) {
      await this.cacheService.incrementConfirmAttempts(
        existingUser.id,
        confirmationRecord.confirmationType,
        redisConfig.ttl.confirmationCode
      );
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
      await this.cacheService.incrementConfirmAttempts(
        existingUser.id,
        confirmationRecord.confirmationType,
        redisConfig.ttl.confirmationCode
      );
      throw AppError.unauthorized("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    // Compare new pass against existing pass to see if it's the same
    const isPasswordMatch = await bcrypt.compare(input.newPassword, existingUser.passwordHash);

    if (isPasswordMatch) {
      throw AppError.forbidden("Your new password cannot be same as old password");
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 12);

    // db transactions
    const { revokedSessions } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await this.emailConfirmationRepo.markUsed(confirmationRecord.id, tx);

      // tx 2 - invalidate all existing sessions for the user
      const revokedSessions = await this.sessionRepo.revokeAllActive(existingUser.id, tx);

      // tx 3 - update password
      const user = await this.authUserRepo.updatePassword(existingUser.id, newPasswordHash, tx);

      // tx 4 - Promote account to verified, if unverifed
      if (!user.isEmailVerified) {
        await this.authUserRepo.markEmailVerified(existingUser.id, tx);
      }

      return { revokedSessions };
    });

    // Blocklist every session revoked by the password reset
    await Promise.all(
      revokedSessions.map((session) =>
        this.cacheService.blocklistSession(session.id, redisConfig.ttl.accessToken)
      )
    );

    // Send password reset notification
    void this.emailService.sendPasswordResetNotification(tempEmailDomain);

    return {
      message: "Your password has been reset",
    };
  }

  // Logout
  async logout(refreshToken: string | null) {
    if (!refreshToken) {
      return {
        message: "Logout successfully",
      };
    }

    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const activeSession = await this.sessionRepo.findActiveByRefreshTokenHash(refreshTokenHash);

    if (!activeSession) {
      return {
        message: "Logout successfully",
      };
    }

    // Revoke session in DB
    await this.sessionRepo.revokeSession(activeSession.id);

    // Blocklist sessionId in Redis so the access token is rejected immediately
    const sessionId = activeSession.id;

    if (sessionId) {
      await this.cacheService.blocklistSession(sessionId, redisConfig.ttl.accessToken);
    }

    return {
      message: "Logout successfully",
    };
  }

  // Refresh access token - (need refresh token in cookie)
  async refreshToken(refreshToken: string | null, meta: IRequestMeta) {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token is missing", ErrorCode.UNAUTHORIZED);
    }

    // Hash refresh token
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    // find the session
    const activeSession = await this.sessionRepo.findActiveByRefreshTokenHash(refreshTokenHash);

    if (!activeSession) {
      throw AppError.unauthorized("Invalid refresh token", ErrorCode.UNAUTHORIZED);
    }

    // Check if session already revoked
    if (activeSession.revokedAt) {
      const revokedSessions = await this.sessionRepo.revokeAllActive(activeSession.authUserId);

      await Promise.all(
        revokedSessions.map((session) =>
          this.cacheService.blocklistSession(session.id, redisConfig.ttl.accessToken)
        )
      );

      throw AppError.unauthorized("Refresh token has been revoked", ErrorCode.UNAUTHORIZED);
    }

    // Check if refresh token is expired
    if (activeSession.expiresAt <= new Date()) {
      throw AppError.unauthorized("Refresh token has expired", ErrorCode.UNAUTHORIZED);
    }

    // Fetch user
    const existingUser = await this.authUserRepo.findById(activeSession.authUserId);

    if (!existingUser) {
      throw AppError.unauthorized("User no longer exists", ErrorCode.UNAUTHORIZED);
    }

    // Rotata refresh token
    const newrefreshToken = this.tokenService.generateRefreshToken();
    const newRefreshTokenHash = this.tokenService.hashRefreshToken(newrefreshToken);

    // Update session in DB
    await this.sessionRepo.rotateRefreshToken(activeSession.id, {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + authConfig.refreshTokenTTL),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // sign access Token
    const accessToken = this.tokenService.signAccessToken({
      userId: existingUser.id,
      sessionId: activeSession.id,
    });

    // Sanitized user to return to client
    const sanitizedUser = sanitizeUser(existingUser);

    return { sanitizedUser, accessToken, newrefreshToken };
  }
}
