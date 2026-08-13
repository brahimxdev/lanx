import type { ILookupRepo } from "./lookup.repo.js";
import type {
  IListCountriesQuery,
  IListCurrenciesQuery,
  IListProfessionsQuery,
} from "./lookup.validation.js";
import { searchCountries, searchCurrencies, searchProfessions } from "./lookup.search.js";

export class LookupService {
  constructor(private readonly lookupRepo: ILookupRepo) {}

  async getCountries(queryParams: IListCountriesQuery) {
    const all = await this.lookupRepo.getAllCountries();
    return { countries: searchCountries(all, queryParams.search) };
  }

  async getCurrencies(queryParams: IListCurrenciesQuery) {
    const all = await this.lookupRepo.getAllCurrencies();
    return { currencies: searchCurrencies(all, queryParams.search) };
  }

  async getProfessions(queryParams: IListProfessionsQuery) {
    const all = await this.lookupRepo.getAllProfessions();
    return { professions: searchProfessions(all, queryParams.search) };
  }
}
