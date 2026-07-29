import { LookupController } from "./lookup.controller.js";
import { lookupRepo } from "./lookup.repo.js";
import { LookupService } from "./lookup.service.js";

const lookupService = new LookupService(lookupRepo);

export const lookupController = new LookupController(lookupService);
