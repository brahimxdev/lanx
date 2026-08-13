import { AppError, ErrorCode } from "@/errors/index.js";
import type { IProfileRepo } from "./profile.repo.js";
import type { ICreateProfile, IUpdateProfile } from "./profile.validation.js";
import { mapForeignKeyError } from "./profile.util.js";
import type { StorageService } from "../storage/storage.service.js";
import { randomUUID } from "crypto";
import { sanitizeFilename } from "@/utils/sanitizeFilename.js";
import type { ICacheService } from "@/shared/services/cache.service.js";

export class ProfileService {
  constructor(
    private readonly profileRepo: IProfileRepo,
    private readonly storageService: StorageService,
    private readonly cacheService: ICacheService
  ) {}

  // Fetch loggedin user profile details - (need auth access)
  async getProfile(authUserId: string) {
    const cachedProfile = await this.cacheService.getUserProfile(authUserId);

    if (cachedProfile) {
      return { profile: cachedProfile };
    }

    const profile = await this.profileRepo.findByAuthUserId(authUserId);

    if (!profile) {
      throw AppError.unauthorized("User no longer exist", ErrorCode.UNAUTHORIZED);
    }

    await this.cacheService.setUserProfile(authUserId, profile);

    return { profile };
  }

  // create profile one-time on onboarding - (need auth access)
  async createProfile(authUserId: string, input: ICreateProfile) {
    // Find profile by auth user id
    const existingProfile = await this.profileRepo.existsByAuthUserId(authUserId);

    if (existingProfile) {
      throw AppError.conflict(
        "Profile already exist, if you're looking to edit, please edit in dashboard",
        ErrorCode.ALREADY_EXISTS
      );
    }

    // create profile
    try {
      const newProfile = await this.profileRepo.createProfile({
        authUserId,
        ...input,
      });

      return { newProfile };
    } catch (error) {
      mapForeignKeyError(error);
      throw error;
    }
  }

  // update profile - (need auth access)
  async updateProfile(authUserId: string, input: IUpdateProfile) {
    try {
      const updatedProfile = await this.profileRepo.updateByAuthUserId(authUserId, input);
      if (!updatedProfile) {
        throw AppError.notFound("Profile not found", ErrorCode.NOT_FOUND);
      }

      await this.cacheService.invalidateUserProfile(authUserId);

      return { updatedProfile };
    } catch (error) {
      mapForeignKeyError(error);
      throw error;
    }
  }

  // Upload logo
  async uploadLogo(authUserId: string, file: Express.Multer.File) {
    const key = `logos/${authUserId}/${randomUUID()}-${sanitizeFilename(file.originalname)}`;
    const logoUrl = await this.storageService.uploadPublic(key, file.buffer, file.mimetype);

    const existingProfile = await this.profileRepo.findByAuthUserId(authUserId);

    // No profile row yet. Client holds the URL until POST /profile.
    if (!existingProfile) {
      return { logoUrl };
    }

    // Clean up the old logo now that the new one is safely uploaded
    if (existingProfile.logoUrl) {
      await this.storageService.deletePublic(existingProfile.logoUrl);
    }

    const updatedProfile = await this.profileRepo.updateLogoUrl(authUserId, logoUrl);

    await this.cacheService.invalidateUserProfile(authUserId);

    return { logoUrl: updatedProfile?.logoUrl ?? logoUrl };
  }

  // Delete logo
  async deleteLogo(authUserId: string) {
    const existingProfile = await this.profileRepo.findByAuthUserId(authUserId);

    if (!existingProfile) {
      throw AppError.notFound("Profile not found.", ErrorCode.NOT_FOUND);
    }

    if (existingProfile.logoUrl) {
      await this.storageService.deletePublic(existingProfile.logoUrl);
    }

    await this.profileRepo.updateLogoUrl(authUserId, null);

    await this.cacheService.invalidateUserProfile(authUserId);

    return { logoUrl: null };
  }
}
