import countriesList from "world-countries";
import { writeFileSync } from "fs";

const seedData = countriesList.map((country) => {

  const currencyCodes = Object.keys(country.currencies ?? {});

  return {
    code: country.cca2, // ISO 3166-1 alpha-2, e.g. 'NG'
    name: country.name.common,
    defaultCurrencyCode: currencyCodes[0] ?? null, // first listed currency as default
  };
});

writeFileSync(
  "src/db/seed-data/countries.json",
  JSON.stringify(seedData, null, 2)
);

console.log(`Wrote ${seedData.length} countries to seed-data/countries.json`);
