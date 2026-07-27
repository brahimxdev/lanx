import "@/config/load-env.js";

import { countries, currencies } from "../schema/index.js";
import currenciesData from "../seed-data/currencies.json" with { type: "json" };
import countriesData from "../seed-data/countries.json" with { type: "json" };
import { db } from "../client.js";
import type { Executor } from "../executor.js";
import { reset } from "drizzle-seed";

const seedCurrencies = async (executor: Executor): Promise<void> => {
  for (const currency of currenciesData) {
    await executor
      .insert(currencies)
      .values({ code: currency.code, name: currency.name, symbol: currency.symbol })
      .onConflictDoUpdate({
        target: currencies.code,
        set: { name: currency.name, symbol: currency.symbol },
      });
  }

  console.log(`✅ Seeded ${currenciesData.length} currencies`);
};

const seedCountries = async (executor: Executor): Promise<void> => {
  const validCurrencyCodes = new Set(currenciesData.map((currency) => currency.code));

  for (const country of countriesData) {
    const defaultCurrencyCode =
      country.defaultCurrencyCode && validCurrencyCodes.has(country.defaultCurrencyCode)
        ? country.defaultCurrencyCode
        : null;

    await executor
      .insert(countries)
      .values({
        code: country.code,
        name: country.name,
        defaultCurrencyCode,
      })
      .onConflictDoUpdate({
        target: countries.code,
        set: { name: country.name, defaultCurrencyCode },
      });
  }

  console.log(`✅ Seeded ${countriesData.length} countries`);
};

const main = async (): Promise<void> => {
  await reset(db, { countries, currencies });

  console.log("Seeding reference data...");

  await db.transaction(async (tx) => {
    await seedCurrencies(tx);
    await seedCountries(tx); // currencies must be seeded first — countries FK references currencies
  });

  console.log("✅ Done.");
  process.exit(0);
};

main().catch((err: unknown) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
