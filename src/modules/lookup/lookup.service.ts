import type { ILookupRepo } from "./lookup.repo.js";
import type {
  IListCountriesQuery,
  IListCurrenciesQuery,
  IListProfessionsQuery,
} from "./lookup.validation.js";

export class LookupService {
  constructor(private readonly lookupRepo: ILookupRepo) {}

  // get countries
  async getCountries(queryParams: IListCountriesQuery) {
    const countries = await this.lookupRepo.getCountries(queryParams);

    return { countries };
  }

  // get currencies
  async getCurrencies(queryParams: IListCurrenciesQuery) {
    const currencies = await this.lookupRepo.getCurrencies(queryParams);

    return { currencies };
  }

  // get professions
  async getProfessions(queryParams: IListProfessionsQuery) {
    const professions = await this.lookupRepo.getProfessions(queryParams);

    return { professions };
  }
}
