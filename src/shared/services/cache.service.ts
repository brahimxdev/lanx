import { redisClient } from "@/lib/redis.client.js";
import { redisJsonStore } from "@/lib/cache/redis-store.js";
import { redisConfig } from "@/config/index.js";
import { CacheKeys } from "@/lib/cache/cache.keys.js";
import type { authUsers, profiles, professions, countries, currencies } from "@/db/schema/index.js";

type AuthUser = typeof authUsers.$inferSelect;
type Profile = typeof profiles.$inferSelect;
type Profession = typeof professions.$inferSelect;
type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;

type ProfileResult = Pick<AuthUser, "id" | "email" | "isEmailVerified" | "createdAt"> & {
  firstName: Profile["firstName"] | null;
  lastName: Profile["lastName"] | null;
  businessName: Profile["businessName"] | null;
  logoUrl: Profile["logoUrl"] | null;
  profession: Pick<Profession, "id" | "name" | "slug"> | null;
  country: Pick<Country, "code" | "name"> | null;
  currency: Pick<Currency, "code" | "name" | "symbol"> | null;
};

export interface ICacheService {
  getUserProfile(userId: string): Promise<ProfileResult | null>;
  setUserProfile(userId: string, data: ProfileResult): Promise<void>;
  invalidateUserProfile(userId: string): Promise<void>;

  blocklistSession(sessionId: string, ttlSeconds: number): Promise<void>;
  isSessionBlocked(sessionId: string): Promise<boolean>;

  incrementConfirmAttempts(userId: string, type: string, ttlSeconds: number): Promise<number>;
  getConfirmAttempts(userId: string, type: string): Promise<number>;
  resetConfirmAttempts(userId: string, type: string): Promise<void>;
  checkAndIncrementIssuance(
    userId: string,
    type: string
  ): Promise<{ allowed: boolean; retryAfter?: number }>;
}

export class CacheService implements ICacheService {
  // User Profile

  async getUserProfile(userId: string): Promise<ProfileResult | null> {
    return redisJsonStore.get<ProfileResult>(CacheKeys.userProfile(userId));
  }

  async setUserProfile(userId: string, data: ProfileResult): Promise<void> {
    await redisJsonStore.set(CacheKeys.userProfile(userId), data, redisConfig.ttl.userProfile);
  }

  async invalidateUserProfile(userId: string): Promise<void> {
    await redisJsonStore.del(CacheKeys.userProfile(userId));
  }

  // Session Blocklist
  // TTL = remaining lifetime of the access token (JWT expiry backstops the rest)

  async blocklistSession(sessionId: string, ttlSeconds: number): Promise<void> {
    try {
      await redisClient.set(CacheKeys.blocklistSession(sessionId), "1", {
        expiration: { type: "EX", value: ttlSeconds },
      });
    } catch (err) {
      console.error(`CacheService.blocklistSession failed:`, err);
    }
  }

  async isSessionBlocked(sessionId: string): Promise<boolean> {
    try {
      const result = await redisClient.get(CacheKeys.blocklistSession(sessionId));
      return result === "1";
    } catch (err) {
      // Fail open — Redis being down should not lock out every user
      console.error(`CacheService.isSessionBlocked failed:`, err);
      return false;
    }
  }

  // Rate Limiting

  async incrementConfirmAttempts(
    userId: string,
    type: string,
    ttlSeconds: number
  ): Promise<number> {
    try {
      const key = CacheKeys.rateConfirm(userId, type);
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, ttlSeconds);
      return count;
    } catch (err) {
      console.error(`CacheService.incrementConfirmAttempts failed:`, err);
      return 0; // fail open
    }
  }

  async getConfirmAttempts(userId: string, type: string): Promise<number> {
    try {
      const raw = await redisClient.get(CacheKeys.rateConfirm(userId, type));
      return raw ? parseInt(raw, 10) : 0;
    } catch (err) {
      console.error(`CacheService.getConfirmAttempts failed:`, err);
      return 0;
    }
  }

  async resetConfirmAttempts(userId: string, type: string): Promise<void> {
    try {
      await redisClient.del(CacheKeys.rateConfirm(userId, type));
    } catch (err) {
      console.error(`CacheService.resetConfirmAttempts failed:`, err);
    }
  }

  async checkAndIncrementIssuance(
    userId: string,
    type: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    try {
      const key = CacheKeys.rateIssuance(userId, type);
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, redisConfig.ttl.issuanceWindow); // e.g. 15 min

      if (count > redisConfig.limits.maxIssuancePerWindow) {
        // e.g. 3
        const ttl = await redisClient.ttl(key);
        return { allowed: false, retryAfter: ttl };
      }
      return { allowed: true };
    } catch (err) {
      console.error(`CacheService.checkAndIncrementIssuance failed:`, err);
      return { allowed: true }; // fail open, same posture as your other cache calls
    }
  }
}

export const cacheService = new CacheService();
