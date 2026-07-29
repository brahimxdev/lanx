import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { countries } from "@/db/schema/index.js";
import { asc } from "drizzle-orm";

type Country = typeof countries.$inferSelect;

export interface ILookupRepo {
  getCountries(executor?: Executor): Promise<Country[]>;
}

// Class implementing the interface
export class LookupRepo implements ILookupRepo {
  // get countries
  async getCountries(executor: Executor = db): Promise<Country[]> {
    const country = await executor.select().from(countries).orderBy(asc(countries.name));

    return country;
  }
}

export const lookupRepo = new LookupRepo();
