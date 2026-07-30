import type { Executor } from "@/db/executor.js";
import { countries, currencies, professions } from "@/db/schema/index.js";
import { asc, ilike, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import type {
  IListCountriesQuery,
  IListCurrenciesQuery,
  IListProfessionsQuery,
} from "./lookup.validation.js";

type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;
type Profession = typeof professions.$inferSelect;

interface IPaginatedProfessions {
  professions: Profession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ILookupRepo {
  getCountries(queryParams: IListCountriesQuery, executor?: Executor): Promise<Country[]>;
  getCurrencies(queryParams: IListCurrenciesQuery, executor?: Executor): Promise<Currency[]>;
  getProfessions(queryParams: IListProfessionsQuery, executor?: Executor): Promise<Profession[]>;
}

// Class implementing the interface
export class LookupRepo implements ILookupRepo {
  // get countries
  async getCountries(
    queryParams: IListCountriesQuery,
    executor: Executor = db
  ): Promise<Country[]> {
    const { search } = queryParams;

    const country = await executor
      .select()
      .from(countries)
      .where(search ? ilike(countries.name, `%${search}%`) : undefined)
      .orderBy(asc(countries.name));

    return country;
  }

  // get currencies
  async getCurrencies(
    queryParams: IListCurrenciesQuery,
    executor: Executor = db
  ): Promise<Currency[]> {
    const { search } = queryParams;
    const currency = await executor
      .select()
      .from(currencies)
      .where(search ? ilike(currencies.name, `%${search}%`) : undefined)
      .orderBy(asc(currencies.code));

    return currency;
  }

  // get professions
  async getProfessions(
    queryParams: IListProfessionsQuery,
    executor: Executor = db
  ): Promise<Profession[]> {
    const { search, limit, page } = queryParams;
    const offset = (page - 1) * limit;

    const profession = await executor
      .select()
      .from(professions)
      .where(search ? ilike(professions.name, `%${search}%`) : undefined)
      .orderBy(asc(professions.name), asc(professions.id))
      .limit(limit)
      .offset(offset);

    return profession;
  }
}

export const lookupRepo = new LookupRepo();
