import type { Executor } from "@/db/executor.js";
import { countries, currencies, professions } from "@/db/schema/index.js";
import { asc } from "drizzle-orm";
import { db } from "@/db/client.js";

type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;

export interface ILookupRepo {
  getCountries(executor?: Executor): Promise<Country[]>;
  getCurrencies(executor?: Executor): Promise<Currency[]>;
}

// Class implementing the interface
export class LookupRepo implements ILookupRepo {
  // get countries
  async getCountries(executor: Executor = db): Promise<Country[]> {
    const country = await executor.select().from(countries).orderBy(asc(countries.name));

    return country;
  }

  // get currencies
  async getCurrencies(executor: Executor = db): Promise<Currency[]> {
    const currency = await executor.select().from(currencies).orderBy(asc(currencies.code));

    return currency;
  }
}

export const lookupRepo = new LookupRepo();
