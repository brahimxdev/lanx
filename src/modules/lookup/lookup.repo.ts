import type { Executor } from "@/db/executor.js";
import { countries, currencies, professions } from "@/db/schema/index.js";
import { asc, ilike, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import type { IListProfessionsQuery } from "./lookup.validation.js";

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
  getCountries(executor?: Executor): Promise<Country[]>;
  getCurrencies(executor?: Executor): Promise<Currency[]>;
  getProfessions(
    queryParams: IListProfessionsQuery,
    executor?: Executor
  ): Promise<IPaginatedProfessions>;
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

  // get professions
  async getProfessions(
    queryParams: IListProfessionsQuery,
    executor: Executor = db
  ): Promise<IPaginatedProfessions> {
    const { search, limit, page } = queryParams;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      executor
        .select()
        .from(professions)
        .where(search ? ilike(professions.name, `${search}%`) : undefined)
        .orderBy(asc(professions.name), asc(professions.id))
        .limit(limit)
        .offset(offset),

      executor
        .select({ count: sql<number>`count(*)::int` })
        .from(professions)
        .where(search ? ilike(professions.name, `${search}%`) : undefined),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      professions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const lookupRepo = new LookupRepo();
