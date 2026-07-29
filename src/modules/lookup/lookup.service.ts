import type { ILookupRepo } from "./lookup.repo.js";
import type { IListProfessionsQuery } from "./lookup.validation.js";

export class LookupService {
  constructor(private readonly lookupRepo: ILookupRepo) {}

  // get countries
  async getCountries() {
    const countries = await this.lookupRepo.getCountries();

    return { countries };
  }

  // get currencies
  async getCurrencies() {
    const currencies = await this.lookupRepo.getCurrencies();

    return { currencies };
  }

  // get professions
  async getProfessions(queryParams: IListProfessionsQuery) {
    const professions = await this.lookupRepo.getProfessions(queryParams);

    return {professions}
  }
}
