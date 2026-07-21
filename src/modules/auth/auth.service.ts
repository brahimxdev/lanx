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
import { authConfig } from "@/config/index.js";
import type { IAuthenticatedUser, IRequestMeta } from "@/modules/auth/index.js";
import { tempEmailDomain } from "@/shared/constants/tempEmail.js";

export class AuthService {
  constructor(
    private readonly authUserRepo: IAuthUserRepo,
    private readonly emailConfirmationRepo: IEmailConfirmationRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly emailService: EmailService,
    private readonly tokenService: ITokenService
  ) {}

  // Create new user
  async createUser(input: ISignup) {
    // 1. Check if account exist by email
    const existingUser = await this.authUserRepo.findByEmail(input.email);

    if (existingUser) {
      throw AppError.conflict(
        "An account with this email already exists, please sign in",
        ErrorCode.ALREADY_EXISTS
      );
    }

    // 2. Hash password + Generate confirmation code
    const passwordHash = await bcrypt.hash(input.password, 12);
    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

    // 3. Save unverified user
    // db transactions
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

    const newUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    // Send code to user via email
    await this.emailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

    return { newUser };
  }

  // Confirm email for user signing up
  async confirmEmail(input: IConfirmEmail, meta: IRequestMeta) {
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

    // Attempt count check
    if (confirmationRecord.attemptCount >= 5) {
      throw AppError.tooManyRequests("Something went wrong, please resend a new code");
    }

    // Expiry check
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
      throw AppError.unauthorized("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    // Generate + hash refresh Token
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    // db transactions
    const { updatedUser, newSessionRecord } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await this.emailConfirmationRepo.markUsed(confirmationRecord.id, tx);

      let updatedUser: typeof existingUser;

      // tx 2 - mark email verified
      switch (confirmationRecord.confirmationType) {
        case "sign_up": {
          updatedUser = await this.authUserRepo.markEmailVerified(existingUser.id, tx);
          break;
        }

        default: {
          throw AppError.internalServerError("Unsupported confirmation type for this flow");
        }
      }

      // tx 3 - invalidate all existing sessions for the user
      await this.sessionRepo.revokeAllActive(existingUser.id);

      // tx 4 - Issue new session
      const newSessionRecord = await this.sessionRepo.createSession(
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

      return { updatedUser, newSessionRecord };
    });

    // sign access Token
    const accessToken = this.tokenService.signAccessToken({
      userId: existingUser.id,
      sessionId: newSessionRecord.id,
    });

    // Sanitized user to return to client
    const newUser: IAuthenticatedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      isEmailVerified: updatedUser.isEmailVerified,
      createdAt: updatedUser.createdAt,
    };

    await this.emailService.sendWelcomeEmailPro(tempEmailDomain, { email: newUser.email });
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
    await this.emailService.sendConfirmationCode(tempEmailDomain, confirmationCode);

    return {
      message: "If an account exist, a code has been sent!",
    };
  }

  // Sign in
  async signIn(input: ISignIn, meta: IRequestMeta) {
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

    // Generate + hash refresh Token
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

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

    // sign access Token
    const accessToken = this.tokenService.signAccessToken({
      userId: existingUser.id,
      sessionId: newSessionRecord.id,
    });

    // Sanitized user to return to client
    const user: IAuthenticatedUser = {
      id: existingUser.id,
      email: existingUser.email,
      isEmailVerified: existingUser.isEmailVerified,
      createdAt: existingUser.createdAt,
    };

    return { user, accessToken, refreshToken };
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

    // 4. Send code to user via email
    await this.emailService.sendPasswordResetCode(tempEmailDomain, confirmationCode);

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

    // Attempt count check
    if (confirmationRecord.attemptCount >= 5) {
      throw AppError.tooManyRequests("Something went wrong, please resend a new code");
    }

    // Expiry check
    if (confirmationRecord.expiresAt <= new Date()) {
      await this.emailConfirmationRepo.incrementAttemptCount(confirmationRecord.id);
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
      await this.emailConfirmationRepo.incrementAttemptCount(confirmationRecord.id);
      throw AppError.unauthorized("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    // Compare new pass against existing pass to see if it's the same
    const isPasswordMatch = await bcrypt.compare(input.newPassword, existingUser.passwordHash);

    if (isPasswordMatch) {
      throw AppError.forbidden("Your new password cannot be same as old password");
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 12);

    // db transactions
    await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await this.emailConfirmationRepo.markUsed(confirmationRecord.id, tx);

      // tx 2 - invalidate all existing sessions for the user
      await this.sessionRepo.revokeAllActive(existingUser.id, tx);

      // tx 3 - update password
      const user = await this.authUserRepo.updatePassword(existingUser.id, newPasswordHash, tx);

      // tx 4 - Promote account to verified, if unverifed
      if (!user.isEmailVerified) {
        await this.authUserRepo.markEmailVerified(existingUser.id, tx);
      }
    });

    // Send password reset notification
    await this.emailService.sendPasswordResetNotification(tempEmailDomain);

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

    await this.sessionRepo.revokeSession(activeSession.id);

    return {
      message: "Logout successfully",
    };
  }
}

