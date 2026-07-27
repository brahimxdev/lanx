import type { Executor } from "@/db/executor.js";
import { authUsers, profiles } from "@/db/schema/index.js";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client.js";

type AuthUser = typeof authUsers.$inferSelect;
type Profile = typeof profiles.$inferSelect;

export type MeResult = Pick<AuthUser, "id" | "email" | "isEmailVerified" | "createdAt"> & {
  firstName: Profile["firstName"] | null;
  lastName: Profile["lastName"] | null;
  businessName: Profile["businessName"] | null;
  logoUrl: Profile["logoUrl"] | null;
  profession: Profile["professionId"] | null;
  country: Profile["countryCode"] | null;
  currency: Profile["currencyCode"] | null;
};

export interface IAccountRepo {
  findProfile(authUserId: string, executor?: Executor): Promise<MeResult | null>;
  softDelete(authUserId: string, executor?: Executor): Promise<void>;
}

export class AccountRepo implements IAccountRepo {
  // Fetch user + profile in a single LEFT JOIN
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
        profession: profiles.professionId,
        country: profiles.countryCode,
        currency: profiles.currencyCode,
      })
      .from(authUsers)
      .leftJoin(profiles, eq(profiles.authUserId, authUsers.id))
      .where(and(eq(authUsers.id, authUserId), isNull(authUsers.deletedAt)))
      .limit(1);

    return result ?? null;
  }
  // Soft delete profile
  async softDelete(authUserId: string, executor: Executor = db): Promise<void> {
    await executor
      .update(profiles)
      .set({ deletedAt: new Date() })
      .where(eq(profiles.authUserId, authUserId));
  }
}

export const accountRepo = new AccountRepo();
