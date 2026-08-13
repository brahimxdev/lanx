import type { countries, currencies, professions } from "@/db/schema/index.js";

type Country = typeof countries.$inferSelect;
type Currency = typeof currencies.$inferSelect;
type Profession = typeof professions.$inferSelect;

const matches = (fields: (string | null | undefined)[], query: string): boolean => {
  return fields.some((field) => field?.toLowerCase().includes(query));
};

export const searchCountries = (items: Country[], query?: string): Country[] => {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((c) => matches([c.name, c.code], q));
};

export const searchCurrencies = (items: Currency[], query?: string): Currency[] => {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((c) => matches([c.name, c.code, c.symbol], q));
};

export const searchProfessions = (items: Profession[], query?: string): Profession[] => {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((p) => matches([p.name, p.slug], q));
};
