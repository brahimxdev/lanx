import type { ISignupInput } from "./auth.validation.js";
import { db } from "@/db/client.js";
import { AppError, ErrorCode } from "@/errors/index.js";
import bcrypt from "bcryptjs";
import { generateConfirmationCode, hashConfirmationCode } from "@/utils/confirmation-code.util.js";
import { authUserRepository, emailConfirmationRepository } from "./auth.repository.js";
import type { IAuthenticatedUser } from "./auth.types.js";

export class AuthService {
  // Create new user
  static async createUser(input: ISignupInput): Promise<{ newUser: IAuthenticatedUser }> {
    const existingUser = await authUserRepository.findByEmail(input.email);

    if (existingUser) {
      throw AppError.conflict(
        "An account with this email already exists",
        ErrorCode.ALREADY_EXISTS
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const confirmationCode = generateConfirmationCode();
    const confirmationCodeHash = hashConfirmationCode(confirmationCode);

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

    const newUser: IAuthenticatedUser = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    return { newUser };
  }
}
