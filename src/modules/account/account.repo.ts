import type { Executor } from "@/db/executor.js";
import { authUsers, profiles, professions, countries, currencies } from "@/db/schema/index.js";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client.js";

type AuthUser = typeof authUsers.$inferSelect;
type Profile = typeof profiles.$inferSelect;
type Profession = typeof professions.$inferSelect;
type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;

export type MeResult = Pick<AuthUser, "id" | "email" | "isEmailVerified" | "createdAt"> & {
  firstName: Profile["firstName"] | null;
  lastName: Profile["lastName"] | null;
  businessName: Profile["businessName"] | null;
  logoUrl: Profile["logoUrl"] | null;
  profession: Pick<Profession, "id" | "name" | "slug"> | null;
  country: Pick<Country, "code" | "name"> | null;
  currency: Pick<Currency, "code" | "name" | "symbol"> | null;
};

export interface IAccountRepo {
  findProfile(authUserId: string, executor?: Executor): Promise<MeResult | null>;
}

export class AccountRepo implements IAccountRepo {
  // Fetch user + profile + resolved lookup labels in a single query
  async findProfile(authUserId: string, executor: Executor = db): Promise<MeResult | null> {
    const [result] = await executor
      .select({
        // auth_users fields
        id: authUsers.id,
        email: authUsers.email,
        isEmailVerified: authUsers.isEmailVerified,
        createdAt: authUsers.createdAt,
        // profiles fields (null if no profile yet)
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        businessName: profiles.businessName,
        logoUrl: profiles.logoUrl,
        // resolved lookup rows (null if profile has none set, or no profile at all)
        professionId: professions.id,
        professionName: professions.name,
        professionSlug: professions.slug,
        countryCode: countries.code,
        countryName: countries.name,
        currencyCode: currencies.code,
        currencyName: currencies.name,
        currencySymbol: currencies.symbol,
      })
      .from(authUsers)
      .leftJoin(profiles, eq(profiles.authUserId, authUsers.id))
      .leftJoin(professions, eq(professions.id, profiles.professionId))
      .leftJoin(countries, eq(countries.code, profiles.countryCode))
      .leftJoin(currencies, eq(currencies.code, profiles.currencyCode))
      .where(and(eq(authUsers.id, authUserId), isNull(authUsers.deletedAt)));
    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      isEmailVerified: result.isEmailVerified,
      createdAt: result.createdAt,
      firstName: result.firstName,
      lastName: result.lastName,
      businessName: result.businessName,
      logoUrl: result.logoUrl,
      profession:
        result.professionId !== null &&
        result.professionName !== null &&
        result.professionSlug !== null
          ? {
              id: result.professionId,
              name: result.professionName,
              slug: result.professionSlug,
            }
          : null,
      country:
        result.countryCode !== null && result.countryName !== null
          ? { code: result.countryCode, name: result.countryName }
          : null,
      currency:
        result.currencyCode !== null &&
        result.currencyName !== null &&
        result.currencySymbol !== null
          ? { code: result.currencyCode, name: result.currencyName, symbol: result.currencySymbol }
          : null,
    };
  }
}

export const accountRepo = new AccountRepo();
