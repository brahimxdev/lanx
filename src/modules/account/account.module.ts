import { authUserRepo, emailConfirmationRepo, sessionRepo } from "@/shared/repo/index.js";
import { AccountService } from "./account.service.js";
import { emailService } from "../email/email.service.js";
import { tokenService } from "../auth/token.service.js";
import { AccountController } from "./account.controller.js";
import { cacheService } from "@/shared/services/cache.service.js";

const accountService = new AccountService(
  authUserRepo,
  emailConfirmationRepo,
  sessionRepo,
  emailService,
  tokenService,
  cacheService
);

export const accountController = new AccountController(accountService, tokenService);
