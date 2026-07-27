import currencyCodes from "currency-codes";
import symbolMap from "currency-symbol-map";
import { writeFileSync } from "fs";

const seedData = currencyCodes.data.map((currency) => ({
  code: currency.code,
  name: currency.currency,
  symbol: (symbolMap as Record<string, string>)[currency.code] ?? currency.code,
}));

writeFileSync("src/db/seed-data/currencies.json", JSON.stringify(seedData, null, 2));

console.log(`Wrote ${seedData.length} currencies to seed-data/currencies.json`)
