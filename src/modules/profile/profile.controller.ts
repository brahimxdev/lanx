import type { TypedBodyRequest, TypedRequest } from "@/types/typed-request.js";
import type { ProfileService } from "./profile.service.js";
import type { IAuthenticatedUser } from "../auth/auth.types.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { Response } from "express";
import type { ICreateProfile, IUpdateProfile } from "./profile.validation.js";

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

  // create profile one-time on onboarding - (need auth access)
  createProfile = async (req: TypedBodyRequest<ICreateProfile>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;

    const input = req.validated.body;

    // Service layer to handle logic
    const { newProfile } = await this.profileService.createProfile(authUserId, input);

    res.status(HttpStatus.Created).json({
      status: true,
      data: newProfile,
    });
  };

  // update profile - (need auth access)
  updateProfile = async (req: TypedBodyRequest<IUpdateProfile>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;

    const input = req.validated.body;

    // Service layer to handle logic
    const { updatedProfile } = await this.profileService.updateProfile(authUserId, input);

    res.status(HttpStatus.Created).json({
      status: true,
      data: updatedProfile,
    });
  };

  // Upload logo - (need auth access)
  uploadLogo = async (req: TypedRequest, res: Response) => {
    this.assertUser(req);

    const authUserId = req.user.id;

    if (!req.file) {
      throw AppError.badRequest("No file provided", ErrorCode.VALIDATION_ERROR);
    }

    // Service layer to handle logic
    const { logoUrl } = await this.profileService.uploadLogo(authUserId, req.file);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { logoUrl },
    });
  };

  // Delete logo - (need auth access)
  deleteLogo = async (req: TypedRequest, res: Response): Promise<void> => {
    this.assertUser(req);

    const authUserId = req.user.id;

    const { logoUrl } = await this.profileService.deleteLogo(authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { logoUrl },
    });
  };
}
