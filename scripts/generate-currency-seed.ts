import { writeFileSync } from "fs";
import currencyCodesRaw from "currency-codes";
import symbolMapRaw from "currency-symbol-map";

interface CurrencyCodeEntry {
  code: string;
  currency: string;
}

interface CurrencyCodeModule {
  data: CurrencyCodeEntry[];
}

const currencyCodes = currencyCodesRaw as CurrencyCodeModule;
const symbolMap = symbolMapRaw as Record<string, string>;

const seedData = currencyCodes.data.map((currency) => ({
  code: currency.code,
  name: currency.currency,
  symbol: symbolMap[currency.code] ?? currency.code,
}));

writeFileSync("src/db/seed-data/currencies.json", JSON.stringify(seedData, null, 2));

console.log(`Wrote ${String(seedData.length)} currencies to seed-data/currencies.json`);
