import type { IConfirmEmail, ISignupInput } from "./auth.validation.js";
import { db } from "@/db/client.js";
import { AppError, ErrorCode } from "@/errors/index.js";
import bcrypt from "bcryptjs";
import {
  generateConfirmationCode,
  hashConfirmationCode,
  verifyConfirmationCode,
} from "@/utils/confirmation-code.util.js";
import {
  authUserRepository,
  emailConfirmationRepository,
  sessionRespository,
} from "./repo/index.js";
import type { IAuthenticatedUser, IRequestMeta } from "./auth.types.js";
import { EmailService } from "../email/email.service.js";
import { authConfig } from "@/config/index.js";
import { TokenService } from "./token.service.js";

export class AuthService {
  // Create new user
  static async createUser(input: ISignupInput): Promise<{ newUser: IAuthenticatedUser }> {
    // 1. Check if account exist by email
    const existingUser = await authUserRepository.findByEmail(input.email);

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
    // User creation and confirmation-record creation must succeed or fail together
    // without manual DB intervention, so this needs to be atomic.
    const { user } = await db.transaction(async (tx) => {
      const user = await authUserRepository.createUser({ email: input.email, passwordHash }, tx);

      const confirmationRecord = await emailConfirmationRepository.create(
        {
          authUserId: user.id,
          codeHash: confirmationCodeHash,
          confirmationType: "sign_up",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        tx
      );

      return { user, confirmationRecord };
    });

    // 4. Send code to user via email
    await EmailService.sendConfirmationCode("brahimxdev@gmail.com", confirmationCode);

    const newUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    return { newUser };
  }

  // Confirm email for user signing up
  static async confirmEmail(input: IConfirmEmail, meta: IRequestMeta) {
    // 1. Check if account exist by email
    const existingUser = await authUserRepository.findByEmail(input.email);

    if (!existingUser) {
      throw AppError.badRequest("Invalid code or email", ErrorCode.INVALID_CODE);
    }

    if (existingUser.isEmailVerified) {
      throw AppError.conflict(
        "This email is already verified, please sign in",
        ErrorCode.ALREADY_VERIFIED
      );
    }

    // Look up latest unused confirmation code for the user
    const confirmationRecord = await emailConfirmationRepository.findLatestUnused(existingUser.id);

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
    const isExpired = confirmationRecord.expiresAt <= new Date();
    if (isExpired) {
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
      throw AppError.unauthorized(
        "This code has expired, please request a new one",
        ErrorCode.INVALID_CODE
      );
    }

    // Generate + hash refresh Token
    const refreshToken = TokenService.generateRefreshToken();
    const refreshTokenHash = TokenService.hashRefreshToken(refreshToken);

    // db transactions
    const { updatedUser, newSessionRecord } = await db.transaction(async (tx) => {
      // tx 1 - mark code as used
      await emailConfirmationRepository.markUsed(confirmationRecord.id, tx);

      let updatedUser: typeof existingUser;

      // tx 2 - mark email verified or update email
      switch (confirmationRecord.confirmationType) {
        case "sign_up": {
          updatedUser = await authUserRepository.markEmailVerified(existingUser.id, tx);
          break;
        }

        case "change_email": {
          // TODO: implement code for situation when code type is for change_email
          throw AppError.internalServerError("Not yet implement change_email situation");
        }

        default: {
          throw AppError.internalServerError("Unsupported confirmation type for this flow");
        }
      }

      // tx 3 - invalidate all existing sessions for the user
      await sessionRespository.revokeAllActive(existingUser.id);

      // tx 4 - Issue new session
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

      return { updatedUser, newSessionRecord };
    });

    // sign access Token
    const accessToken = TokenService.signAccessToken({
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

    await EmailService.sendWelcomeEmailPro("brahimxdev@gmail.com", { email: newUser.email });
    return { newUser, accessToken, refreshToken };
  }
}
