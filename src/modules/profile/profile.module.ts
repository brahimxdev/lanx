import { storageService } from "../storage/storage.service.js";
import { ProfileController } from "./profile.controller.js";
import { profileRepo } from "./profile.repo.js";
import { ProfileService } from "./profile.service.js";

export const profileService = new ProfileService(profileRepo, storageService);

export const profileController = new ProfileController(profileService);
