import { LookupController } from "./lookup.controller.js";
import { LookupRepo } from "@/modules/lookup/lookup.repo.js";
import { CachedLookupRepo } from "@/modules/lookup/lookup.cache.repo.js";
import { LookupService } from "@/modules/lookup/lookup.service.js";

const pgLookupRepo = new LookupRepo();
const lookupRepo = new CachedLookupRepo(pgLookupRepo);
const lookupService = new LookupService(lookupRepo);

export const lookupController = new LookupController(lookupService);
