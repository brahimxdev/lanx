import { authUserRepo, emailConfirmationRepo, sessionRepo } from "@/shared/repo/index.js";
import { AuthService } from "./auth.service.js";
import { emailService } from "../email/email.service.js";
import { tokenService } from "./token.service.js";
import { AuthController } from "./auth.controller.js";

const authService = new AuthService(
  authUserRepo,
  emailConfirmationRepo,
  sessionRepo,
  emailService,
  tokenService
);

export const authController = new AuthController(authService, tokenService);
