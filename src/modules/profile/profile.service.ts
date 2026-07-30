import { AppError, ErrorCode } from "@/errors/index.js";
import type { IProfileRepo } from "./profile.repo.js";
import type { ICreateProfile } from "./profile.validation.js";
import { mapForeignKeyError } from "./profile.util.js";

export class ProfileService {
  constructor(private readonly profileRepo: IProfileRepo) {}

  // Fetch loggedin user profile details - (need auth access)
  async getProfile(authUserId: string) {
    const profile = await this.profileRepo.findByAuthUserId(authUserId);

    if (!profile) {
      throw AppError.unauthorized("User no longer exist", ErrorCode.UNAUTHORIZED);
    }

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
}
