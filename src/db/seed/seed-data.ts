import "@/config/load-env.js";

import { sql, eq } from "drizzle-orm";
import { countries, currencies, professions, profiles, authUsers } from "../schema/index.js";
import currenciesData from "../seed-data/currencies.json" with { type: "json" };
import countriesData from "../seed-data/countries.json" with { type: "json" };
import professionsData from "../seed-data/professions.json" with { type: "json" };
import { db } from "../client.js";
import type { Executor } from "../executor.js";
import { hashPassword } from "../../utils/hashPassword.js";

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

const seedProfessions = async (executor: Executor): Promise<void> => {
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

// Dev-only fixtures — sample auth users + profiles for local testing.
// Never runs outside development, and is idempotent so re-running the script is safe.

interface DevAuthUserSeed {
  email: string;
  password: string; // plaintext dev password — hashed before insert, never stored raw
  isEmailVerified: boolean;
}

const devAuthUsersData: DevAuthUserSeed[] = [
  { email: "ibrahim@lanx.dev", password: "DevPassword123!", isEmailVerified: true },
  { email: "amara@lanx.dev", password: "DevPassword123!", isEmailVerified: true },
  { email: "john@lanx.dev", password: "DevPassword123!", isEmailVerified: false },
  { email: "lekxy@lanx.dev", password: "DevPassword123!", isEmailVerified: true },
];

const seedDevAuthUsers = async (executor: Executor): Promise<void> => {
  for (const seed of devAuthUsersData) {
    const passwordHash = await hashPassword(seed.password);

    await executor
      .insert(authUsers)
      .values({
        email: seed.email,
        passwordHash,
        isEmailVerified: seed.isEmailVerified,
      })
      .onConflictDoUpdate({
        target: authUsers.email,
        targetWhere: sql`${authUsers.deletedAt} IS NULL`, // must match the partial unique index exactly
        set: { passwordHash, isEmailVerified: seed.isEmailVerified },
      });
  }

  console.log(`✅ Seeded ${String(devAuthUsersData.length)} dev auth users`);
};

interface DevProfileSeed {
  email: string; // resolved to authUserId at seed time
  firstName: string;
  lastName: string;
  businessName: string | null;
  professionSlug: string;
  countryCode: string;
  currencyCode: string;
}

const devProfilesData: DevProfileSeed[] = [
  {
    email: "ibrahim@lanx.dev",
    firstName: "Ibrahim",
    lastName: "Yusuf",
    businessName: "brahimx",
    professionSlug: "legal",
    countryCode: "NG",
    currencyCode: "NGN",
  },
  {
    email: "amara@lanx.dev",
    firstName: "Amara",
    lastName: "Okafor",
    businessName: "Amara Designs",
    professionSlug: "graphic-design",
    countryCode: "NG",
    currencyCode: "NGN",
  },
  {
    email: "john@lanx.dev",
    firstName: "John",
    lastName: "Smith",
    businessName: null,
    professionSlug: "consultant",
    countryCode: "US",
    currencyCode: "USD",
  },
];

const seedDevProfiles = async (executor: Executor): Promise<void> => {
  for (const seed of devProfilesData) {
    const [authUser] = await executor
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, seed.email))
      .limit(1);

    if (!authUser) {
      console.warn(`⚠️  Skipped profile for ${seed.email} — auth user not found.`);
      continue;
    }

    const [profession] = await executor
      .select({ id: professions.id })
      .from(professions)
      .where(eq(professions.slug, seed.professionSlug))
      .limit(1);

    if (!profession) {
      console.warn(
        `⚠️  Skipped profile for ${seed.email} — profession slug "${seed.professionSlug}" not found.`
      );
      continue;
    }

    await executor
      .insert(profiles)
      .values({
        authUserId: authUser.id,
        firstName: seed.firstName,
        lastName: seed.lastName,
        businessName: seed.businessName,
        professionId: profession.id,
        countryCode: seed.countryCode,
        currencyCode: seed.currencyCode,
      })
      .onConflictDoUpdate({
        target: profiles.authUserId,
        set: {
          firstName: seed.firstName,
          lastName: seed.lastName,
          businessName: seed.businessName,
          professionId: profession.id,
          countryCode: seed.countryCode,
          currencyCode: seed.currencyCode,
        },
      });
  }

  console.log(`✅ Seeded ${String(devProfilesData.length)} dev profiles`);
};

const main = async (): Promise<void> => {
  // await reset(db, { countries, currencies, professions, profiles, authUsers });

  console.log("Seeding data...");

  await db.transaction(async (tx) => {
    await seedCurrencies(tx); // currencies first — countries FK references currencies
    await seedCountries(tx);
    await seedProfessions(tx);
  });

  if (process.env.NODE_ENV === "development") {
    await seedDevAuthUsers(db); // must run before profiles — profiles FK references auth_users
    await seedDevProfiles(db);
  }

  console.log("✅ Done.");
  process.exit(0);
};

main().catch((err: unknown) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
