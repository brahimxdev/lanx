import { AppError, ErrorCode } from "@/errors/index.js";
import type { IProfileRepo } from "./profile.repo.js";

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
}
