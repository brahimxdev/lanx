import type { ILookupRepo } from "./lookup.repo.js";

export class LookupService {
  constructor(private readonly lookupRepo: ILookupRepo) {}

  // get countries
  async getCountries() {
    const countries = await this.lookupRepo.getCountries();

    return { countries };
  }
}
