import { authUserRepo, emailConfirmationRepo, sessionRepo } from "@/shared/repo/index.js";
import { AuthService } from "./auth.service.js";
import { tokenService } from "./token.service.js";
import { AuthController } from "./auth.controller.js";
import { cacheService } from "@/shared/services/cache.service.js";
import { emailQueueProducer } from "./jobs/emailQueue.js";

const authService = new AuthService(
  authUserRepo,
  emailConfirmationRepo,
  sessionRepo,
  emailQueueProducer,
  tokenService,
  cacheService
);

export const authController = new AuthController(authService, tokenService);
