import { redisJsonStore } from "@/lib/cache/redis-store.js";
import { redisConfig } from "@/config/index.js";
import { CacheKeys } from "@/lib/cache/cache.keys.js";
import type { ILookupRepo } from "./lookup.repo.js";
import type { countries, currencies, professions } from "@/db/schema/index.js";

type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;
type Profession = typeof professions.$inferSelect;

export class CachedLookupRepo implements ILookupRepo {
  constructor(private readonly inner: ILookupRepo) {}

  getAllCountries(): Promise<Country[]> {
    return this.cacheAside(CacheKeys.lookupCountries, () => this.inner.getAllCountries());
  }

  getAllCurrencies(): Promise<Currency[]> {
    return this.cacheAside(CacheKeys.lookupCurrencies, () => this.inner.getAllCurrencies());
  }

  getAllProfessions(): Promise<Profession[]> {
    return this.cacheAside(CacheKeys.lookupProfessions, () => this.inner.getAllProfessions());
  }

  async invalidateCountries(): Promise<void> {
    await redisJsonStore.del(CacheKeys.lookupCountries);
  }

  async invalidateCurrencies(): Promise<void> {
    await redisJsonStore.del(CacheKeys.lookupCurrencies);
  }

  async invalidateProfessions(): Promise<void> {
    await redisJsonStore.del(CacheKeys.lookupProfessions);
  }

  private async cacheAside<T>(key: string, fetchFromDb: () => Promise<T>): Promise<T> {
    const cached = await redisJsonStore.get<T>(key);
    if (cached) return cached;

    const fresh = await fetchFromDb();
    await redisJsonStore.set(key, fresh, redisConfig.ttl.lookupData);
    return fresh;
  }
}
