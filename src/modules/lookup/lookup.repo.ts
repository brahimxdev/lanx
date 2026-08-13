import type { Executor } from "@/db/executor.js";
import { countries, currencies, professions } from "@/db/schema/index.js";
import { asc } from "drizzle-orm";
import { db } from "@/db/client.js";

type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;
type Profession = typeof professions.$inferSelect;

export interface ILookupRepo {
  getAllCountries(executor?: Executor): Promise<Country[]>;
  getAllCurrencies(executor?: Executor): Promise<Currency[]>;
  getAllProfessions(executor?: Executor): Promise<Profession[]>;

  invalidateCountries(): Promise<void>;
  invalidateCurrencies(): Promise<void>;
  invalidateProfessions(): Promise<void>;
}

export class LookupRepo implements ILookupRepo {
  async getAllCountries(executor: Executor = db): Promise<Country[]> {
    return executor.select().from(countries).orderBy(asc(countries.name));
  }

  async getAllCurrencies(executor: Executor = db): Promise<Currency[]> {
    return executor.select().from(currencies).orderBy(asc(currencies.code));
  }

  async getAllProfessions(executor: Executor = db): Promise<Profession[]> {
    return executor.select().from(professions).orderBy(asc(professions.name));
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async invalidateCountries(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async invalidateCurrencies(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async invalidateProfessions(): Promise<void> {}
}

export const lookupRepo = new LookupRepo();
