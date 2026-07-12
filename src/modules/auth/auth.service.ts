import type { ISignupInput } from "./auth.validation.js";
import { db } from "@/db/client.js";
import { AppError, ErrorCode } from "@/errors/index.js";
import bcrypt from "bcryptjs";
import { generateConfirmationCode, hashConfirmationCode } from "@/utils/confirmation-code.util.js";
import { authUserRepository, emailConfirmationRepository } from "./auth.repository.js";
import type { IAuthenticatedUser } from "./auth.types.js";
import { EmailService } from "../email/email.service.js";
// import { EmailService } from "../email/email.service.js";

export class AuthService {
  // Create new user
  static async createUser(input: ISignupInput): Promise<{ newUser: IAuthenticatedUser }> {
    // 1. Check if account exist by email
    const existingUser = await authUserRepository.findByEmail(input.email);

    if (existingUser) {
      throw AppError.conflict(
        "An account with this email already exists",
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

      const confirmation = await emailConfirmationRepository.create(
        {
          authUserId: user.id,
          codeHash: confirmationCodeHash,
          confirmationType: "sign_up",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        tx
      );

      return { user, confirmation };
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
}
