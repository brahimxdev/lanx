import "@/config/load-env.js";

import { countries, currencies, professions } from "../schema/index.js";
import currenciesData from "../seed-data/currencies.json" with { type: "json" };
import countriesData from "../seed-data/countries.json" with { type: "json" };
import professionsData from "../seed-data/professions.json" with { type: "json" };
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

  console.log(`✅ Seeded ${String(currenciesData.length)} currencies`);
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

  console.log(`✅ Seeded ${String(countriesData.length)} countries`);
};

const seedProfessions = async (executor: Executor = db) => {
  for (const profession of professionsData) {
    await executor
      .insert(professions)
      .values({
        name: profession.name,
        slug: profession.slug,
        source: "seed",
      })
      .onConflictDoUpdate({
        target: professions.slug,
        set: { name: profession.name }, // only refresh the display name; never touch `source`
      });
  }
  console.log(`✓ Seeded ${String(professionsData.length)} professions`);
};

const main = async (): Promise<void> => {
  await reset(db, { countries, currencies, professions });

  console.log("Seeding data...");

  await seedProfessions(); // professions are independent, so we can seed them first

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
