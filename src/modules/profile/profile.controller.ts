import type { TypedRequest } from "@/types/typed-request.js";
import type { ProfileService } from "./profile.service.js";
import type { IAuthenticatedUser } from "../auth/auth.types.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { Response } from "express";

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private assertUser(
    req: TypedRequest
  ): asserts req is TypedRequest & { user: IAuthenticatedUser } {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
    }
  }

  // Fetch loggedin user profile details - (need auth access)
  getProfile = async (req: TypedRequest, res: Response) => {
    this.assertUser(req);

    const authUserId = req.user.id;

    const { profile } = await this.profileService.getProfile(authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: profile,
    });
  };
}
