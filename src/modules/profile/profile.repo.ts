import type { Executor } from "@/db/executor.js";
import { authUsers, profiles, professions, countries, currencies } from "@/db/schema/index.js";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client.js";
import { AppError } from "@/errors/index.js";

type AuthUser = typeof authUsers.$inferSelect;
type Profile = typeof profiles.$inferSelect;
type Profession = typeof professions.$inferSelect;
type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;
type NewProfile = typeof profiles.$inferInsert;

export type ProfileResult = Pick<AuthUser, "id" | "email" | "isEmailVerified" | "createdAt"> & {
  firstName: Profile["firstName"] | null;
  lastName: Profile["lastName"] | null;
  businessName: Profile["businessName"] | null;
  logoUrl: Profile["logoUrl"] | null;
  profession: Pick<Profession, "id" | "name" | "slug"> | null;
  country: Pick<Country, "code" | "name"> | null;
  currency: Pick<Currency, "code" | "name" | "symbol"> | null;
};

type UpdateProfileData = {
  [K in
    | "firstName"
    | "lastName"
    | "businessName"
    | "professionId"
    | "countryCode"
    | "currencyCode"]?: NewProfile[K] | undefined;
};

export interface IProfileRepo {
  findByAuthUserId(authUserId: string, executor?: Executor): Promise<ProfileResult | null>;
  createProfile(data: NewProfile, executor?: Executor): Promise<NewProfile>;
  existsByAuthUserId(authUserId: string, executor?: Executor): Promise<boolean>;
  updateByAuthUserId(
    authUserId: string,
    data: UpdateProfileData,
    executor?: Executor
  ): Promise<Profile | null>;
  updateLogoUrl(
    authUserId: string,
    logoUrl: string | null,
    executor?: Executor
  ): Promise<Profile | null>;
}

// Class implementing the interface
export class ProfileRepo implements IProfileRepo {
  // Fetch user + profile + resolved lookup labels in a single query
  async findByAuthUserId(
    authUserId: string,
    executor: Executor = db
  ): Promise<ProfileResult | null> {
    const [profile] = await executor
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
      .leftJoin(profiles, eq(profiles.authUserId, authUserId))
      .leftJoin(professions, eq(professions.id, profiles.professionId))
      .leftJoin(countries, eq(countries.code, profiles.countryCode))
      .leftJoin(currencies, eq(currencies.code, profiles.currencyCode))
      .where(and(eq(authUsers.id, authUserId), isNull(authUsers.deletedAt)))
      .limit(1);

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      isEmailVerified: profile.isEmailVerified,
      createdAt: profile.createdAt,
      firstName: profile.firstName,
      lastName: profile.lastName,
      businessName: profile.businessName,
      logoUrl: profile.logoUrl,
      profession:
        profile.professionId !== null &&
        profile.professionName !== null &&
        profile.professionSlug !== null
          ? {
              id: profile.professionId,
              name: profile.professionName,
              slug: profile.professionSlug,
            }
          : null,
      country:
        profile.countryCode !== null && profile.countryName !== null
          ? { code: profile.countryCode, name: profile.countryName }
          : null,
      currency:
        profile.currencyCode !== null &&
        profile.currencyName !== null &&
        profile.currencySymbol !== null
          ? {
              code: profile.currencyCode,
              name: profile.currencyName,
              symbol: profile.currencySymbol,
            }
          : null,
    };
  }

  // Create profile one-time on onboarding
  async createProfile(data: NewProfile, executor: Executor = db): Promise<NewProfile> {
    const [profile] = await executor.insert(profiles).values(data).returning();

    if (!profile) {
      throw AppError.internalServerError("Failed to create profile");
    }

    return profile;
  }

  // Check if a profile exist by authUserId
  async existsByAuthUserId(authUserId: string, executor: Executor = db): Promise<boolean> {
    const [profile] = await executor
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    return profile !== undefined;
  }

  // Update profile by authUserId
  async updateByAuthUserId(
    authUserId: string,
    data: UpdateProfileData,
    executor: Executor = db
  ): Promise<Profile | null> {
    const [updatedProfile] = await executor
      .update(profiles)
      .set(data)
      .where(eq(profiles.authUserId, authUserId))
      .returning();

    return updatedProfile ?? null;
  }

  // Update logo url
  async updateLogoUrl(
    authUserId: string,
    logoUrl: string | null,
    executor: Executor = db
  ): Promise<Profile | null> {
    const [updatedProfile] = await executor
      .update(profiles)
      .set({ logoUrl })
      .where(eq(profiles.authUserId, authUserId))
      .returning();

    return updatedProfile ?? null;
  }
}

export const profileRepo = new ProfileRepo();
